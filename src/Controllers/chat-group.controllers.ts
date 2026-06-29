import { asyncHandler } from "../helpers/asyncHandler.ts";
import ApiError from "../helpers/ApiError.ts";
import ApiResponse from "../helpers/ApiResponse.ts";
import { type Request, type Response, type NextFunction } from "express";
import { db } from "../index.ts";
import User from "../Schema/user.schema.ts";
import Conversation from "../Schema/conversation.schema.ts";
import ConversatiomMem from "../Schema/conversation_member.schema.ts";
import { and, Column, desc, eq, getTableColumns, like } from "drizzle-orm";
import { StatusCodes } from "http-status-codes";
import { uploadToCloudinary } from "../utils/cloudinary.ts";
import { Socket } from "socket.io";
import Contact from "../Schema/Contacts.schema.ts";
import Query from "../helpers/Query.ts";

/*
Create Group With name is required , 
at Least one member is Required , 
group pic is optional , 
admin is Also required , 

*/

export const createGroupChat = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const { name, description, adminsOnly } = req.body as {
      name: string;
      members: number[];
      description: string;
      adminsOnly: boolean;
    };

    const userId: number = req?.user?.id as number;
    const filePath: string = req.file?.path as string;

    let groupPic: string | null = null;
    let groupPic_id: string | null = null;
    // Parse and deduplicate members, remove creator if included
    const rawMembers = req.body.members;
    // Step 1: sanitize synchronously
    const members: number[] = [
      ...new Set(
        (Array.isArray(rawMembers) ? rawMembers : [rawMembers])
          .map((id) => Number(id))
          .filter((id) => !isNaN(id) && id !== userId),
      ),
    ];

    if (members.length < 1)
      return next(
        new ApiError(
          "At least one other member is required",
          StatusCodes.BAD_REQUEST,
        ),
      );

    // Step 2: validate existence against DB
    for (const member of members) {
      const [foundUser] = (await new Query(User).leftJoin(
        Contact,
        {
          id: User.id,
          name: Contact.name,
          phoneNumber: Contact.phoneNumber,
          contactId: Contact.contactId,
        },
        eq(User.phoneNumber, Contact.phoneNumber),
        eq(Contact.contactId, member),
      )) as [
        {
          id: number | null;
          name: string | null;
          phoneNumber: string | null;
          contactId: number | null;
        },
      ];

      console.log(foundUser);
      if (!foundUser?.contactId)
        return next(
          new ApiError(
            `This Contact is not Registered in your Contacts`,
            StatusCodes.BAD_REQUEST,
          ),
        );
      if (!foundUser?.id)
        return next(
          new ApiError(
            `User with id ${member} with name ${foundUser?.name} and ${foundUser?.phoneNumber} does not exist`,
            StatusCodes.BAD_REQUEST,
          ),
        );
    }

    if (filePath) {
      const {
        secure_url,
        public_id,
      }: { secure_url: string; public_id: string } = await uploadToCloudinary(
        filePath,
        `group/${name}`,
      );
      groupPic = secure_url;
      groupPic_id = public_id;
    }

    const [group] = await new Query(Conversation).create({
      group_name: name,
      description,
      group_pic: groupPic,
      group_pic_id: groupPic_id,
      adminsOnly,
      admin: userId,
      type: "group",
    });

    const conversationId = group.conversationId;

    // Build members array — creator as admin + other members
    const allMembers = [
      { conversationId, userId, admin: true, joindAt: new Date() },
      ...members.map((memberId: number) => ({
        conversationId,
        userId: memberId,
        joindAt: new Date(),
      })),
    ];

    await new Query(ConversatiomMem).create(allMembers);

    return res
      .status(StatusCodes.CREATED)
      .json(new ApiResponse(true, "Group Created Successfully", null));
  },
);

// Edit Group Controller => used to update group details (name , pic , description , adminsOnly)
export const editGroupChat = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, description, adminsOnly } = req.body as {
      name: string;
      description: string;
      adminsOnly: boolean;
    };
    const groupId: number = Number(req.query?.id);
    const filePath = req.file?.path as string;

    let groupPic: string | null = null;
    let groupPic_id: string | null = null;

    const group = await new Query(Conversation).getOne(
      {
        group_name: Conversation.group_name,
        group_pic: Conversation.group_pic,
        group_pic_id: Conversation.group_pic_id,
      },
      eq(Conversation.conversationId, groupId),
    );

    if (filePath) {
      const {
        secure_url,
        public_id,
      }: { secure_url: string; public_id: string } = await uploadToCloudinary(
        filePath,
        `group/${name}`,
      );
      groupPic = secure_url;
      groupPic_id = public_id;
    }

    await new Query(Conversation).update(
      {
        group_name: name,
        description,
        adminsOnly,
        group_pic: groupPic !== null ? groupPic : group[0]?.group_pic,
        group_pic_id:
          groupPic_id !== null ? groupPic_id : group[0]?.group_pic_id,
      },
      eq(Conversation.conversationId, groupId),
    );

    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(true, "Group Updated Successfully", null));
  },
);

// Add Admins To Group Controller
// Validate User or Contact (Using PhoneNumber) that the user is using platform or not or he is contact or not
// admin must be user in group so validate user must be in group
export const addAdminsToGroup = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { members } = req.body as { members: number[] };
    const groupId: number = Number(req.query?.id);

    await new Query(Conversation).getOne(
      {
        conversationId: Conversation.conversationId,
      },
      eq(Conversation.conversationId, groupId),
    );

    for (const member of members) {
      const [foundMember] = await new Query(User).innerJoin(
        ConversatiomMem,
        {
          id: User.id,
          name: User.username,
          phoneNumber: User.phoneNumber,
          isAdmin: ConversatiomMem.admin,
        },
        eq(User.id, ConversatiomMem.conversationId),
        and(
          eq(ConversatiomMem.userId, member),
          eq(ConversatiomMem.conversationId, groupId),
        ),
      );
      if (foundMember?.isAdmin)
        return next(new ApiError("User is already admin", 400));

      await new Query(ConversatiomMem).update(
        { admin: true },
        and(
          eq(ConversatiomMem.userId, member),
          eq(ConversatiomMem.conversationId, groupId),
        ),
      );
    }

    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(true, "Admins Added Successfully", null));
  },
);

// Add Admins To Group Controller
// Validate User or Contact (Using PhoneNumber) that the user is using platform or not or he is contact or not
// admin must be user in group so validate user must be in group
export const removeAdminFromGroup = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { member } = req.body as { member: number };
    const groupId: number = Number(req.query?.id);
    // Check on Group in Datebase
    const group = await new Query(Conversation).innerJoin(
      ConversatiomMem,
      {
        conversationId: Conversation.conversationId,
        admin: ConversatiomMem.admin,
        userId: ConversatiomMem.userId,
      },
      eq(Conversation.conversationId, ConversatiomMem.conversationId),
      and(
        eq(ConversatiomMem.conversationId, groupId),
        eq(ConversatiomMem.admin, true),
      ),
    );
    const filterAdmin = group.filter((admin) => admin.userId == member);

    if (filterAdmin.length == 0)
      return next(new ApiError("User is Already not admin", 400));

    if (group.length == 1)
      return next(
        new ApiError("You are the only admin. You can't remove yourself", 400),
      );
    await new Query(ConversatiomMem).update(
      { admin: false },
      and(
        eq(ConversatiomMem.userId, member),
        eq(ConversatiomMem.conversationId, groupId),
      ),
    );

    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(true, "Admin Removed Successfully", null));
  },
);

// Add Members To Group
// Validate User or Contact (Using PhoneNumber) that the user is using platform or not or he is contact or not
// validate user being already added in group
// This Socket Event is used to add members to group
// Client send userId and GroupId To Add Members => server Validate User => server emit a socket event to client with user details and message
export const addMemebers = (io: any, socket: Socket) => {};

// Remove Members From Group
/*
This is A Socket Event
Client send userId and GroupId To Remove Members => server Validate User => server emit a socket event to client with user details and message
validate user being already added in group
*/
export const removeMembers = (io: any, socket: Socket) => {};
// Think About This Later
export const deleteGroupChat = asyncHandler(
  (req: Request, res: Response, next: NextFunction) => {},
);

// Get Groups that you are memeber and sort them by joindAt Asc
export const getGroupChats = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const {
      page,
      limit,
      search,
      orderBy = Conversation.group_name,
      sort,
    } = req.query as {
      page: number;
      limit: number;
      search: string;
      orderBy: Column;
      sort: typeof desc;
    };
    const groups = await new Query(Conversation).innerJoin(
      ConversatiomMem,
      {
        groupName: Conversation.group_name,
        groupPic: Conversation.group_pic,
        groupPicId: Conversation.group_pic_id,
        conversationId: Conversation.conversationId,
        adminsOnly: Conversation.adminsOnly,
      }, // 2. selector
      eq(Conversation.conversationId, ConversatiomMem.conversationId),
      and(
        eq(ConversatiomMem.userId, userId),
        like(Conversation.group_name, `%${search}%`),
      ),
      Number(limit),
      Number(page),
      sort,
      orderBy,
    );

    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(true, "Groups Fetched Successfully", groups));
  },
);

// Get Group Details by GroupId in query params
export const getGroupChat = asyncHandler(
  (req: Request, res: Response, next: NextFunction) => {},
);

// Exit Group means Deleting Group from your group list and also deleting your userId from group members
export const exitGroupChat = asyncHandler(
  (req: Request, res: Response, next: NextFunction) => {},
);
