import { asyncHandler } from "../helpers/asyncHandler.ts";
import ApiError from "../helpers/ApiError.ts";
import ApiResponse from "../helpers/ApiResponse.ts";
import { type Request, type Response, type NextFunction } from "express";
import User from "../Schema/user.schema.ts";
import Conversation from "../Schema/conversation.schema.ts";
import ConversatiomMem from "../Schema/conversation_member.schema.ts";
import {
  and,
  asc,
  Column,
  desc,
  eq,
  getTableColumns,
  gt,
  isNull,
  like,
  lt,
  ne,
  or,
} from "drizzle-orm";
import { StatusCodes } from "http-status-codes";
import { uploadToCloudinary } from "../utils/cloudinary.ts";
import { Socket } from "socket.io";
import Contact from "../Schema/Contacts.schema.ts";
import Query from "../helpers/Query.ts";
import { io } from "../utils/IntializeSocket.ts";
import { db } from "../index.ts";
import Message from "../Schema/message.schema.ts";
import Recipients from "../Schema/message-recipents.schema.ts";
import { removePicsFromLocal } from "../helpers/removeLocalPics.ts";

/*
Create Group With name is required , 
at Least one member is Required , 
group pic is optional , 
admin is Also required , 

*/

export const createGroupChat = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const {
      name,
      description,
      adminsOnly = false,
    } = req.body as {
      name: string;
      members: number[];
      description: string;
      adminsOnly: string;
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
      const [foundUser] = await new Query(User).leftJoin(
        Contact,
        {
          id: User.id,
          name: Contact.name,
          phoneNumber: Contact.phoneNumber,
          contactId: Contact.contactId,
        },
        eq(User.id, Contact.userId),
        eq(Contact.userId, member),
      );

      console.log(member);

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
      type: "group",
      description,
      group_pic: groupPic,
      group_pic_id: groupPic_id,
      group_name: name,
      adminsOnly: adminsOnly === "true" ? true : false,
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
    removePicsFromLocal(filePath);
    return res
      .status(StatusCodes.CREATED)
      .json(new ApiResponse(true, "Group Created Successfully", null));
  },
);

// Generate Room Id For Group
export const generateRoomId = (io: any, socket: Socket) => {
  return socket.on("group:join", (groupId) => {
    return socket.join(String(groupId));
  });
};

// Edit Group Controller => used to update group details (name , pic , description , adminsOnly)
export const editGroupChat = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, description, adminsOnly } = req.body as {
      name: string;
      description: string;
      adminsOnly: boolean;
    };
    const groupId: number = Number(req.params?.id);
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
        group_pic: groupPic ?? group[0]?.group_pic,
        group_pic_id: groupPic_id ?? group[0]?.group_pic_id,
      },
      eq(Conversation.conversationId, groupId),
    );
    const [updateGroup] = await new Query(Conversation).getOne(
      {
        conversationId: Conversation.conversationId,
        group_name: Conversation.group_name,
        group_pic: Conversation.group_pic,
        group_pic_id: Conversation.group_pic_id,
      },
      eq(Conversation.conversationId, groupId),
      "We Can't Find Group",
    );
    io.emit("group:update", {
      conversationId: updateGroup.conversationId,
      group_name: updateGroup.group_name,
      group_pic: updateGroup.group_pic,
      group_pic_id: updateGroup.group_pic_id,
    });
    removePicsFromLocal(filePath);
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
    const groupId: number = Number(req.params?.id);

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
    const groupId: number = Number(req.params?.id);
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
export const addMembers = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const groupId: number = Number(req.params?.id);
    const { members } = req.body as { members: number[] };

    // Check if the Groups exist or not
    const isExitedGroup = await new Query(Conversation).exists(
      eq(Conversation.conversationId, groupId),
    );

    if (!isExitedGroup) return next(new ApiError("Group Not Found", 404));
    // Check Whether members (Contact) Use Platform or not and check whether they are on your Contact
    for (const member of members) {
      //Check Whether member is added By User in Group or not
      const [addbyUser] = await new Query(User).innerJoin(
        ConversatiomMem,
        {
          id: User.id,
          name: User.username,
          phoneNumber: User.phoneNumber,
          isAdmin: ConversatiomMem.admin,
        },
        eq(User.id, ConversatiomMem.userId),
        and(
          eq(ConversatiomMem.conversationId, groupId),
          eq(ConversatiomMem.userId, userId),
        ),
        "You are not admin or member of this group",
      );
      const [foundMember] = await new Query(User).innerJoin(
        Contact,
        {
          id: User.id,
          name: User.username,
          phoneNumber: User.phoneNumber,
          contactId: Contact.contactId,
        },

        eq(User.phoneNumber, Contact.phoneNumber),
        eq(Contact.userId, member),
        "User is not registered in your contacts or not registered in platform",
      );

      // Check Whether members is aleardy in group
      const isUserInGroup = await new Query(ConversatiomMem).exists(
        and(
          eq(ConversatiomMem.conversationId, groupId),
          eq(ConversatiomMem.userId, foundMember.id),
        ),
      );

      if (isUserInGroup)
        return next(new ApiError("User is already in group", 400));
    }

    const addedMembers = await new Query(ConversatiomMem).create(
      members.map((memberId: number) => ({
        conversationId: groupId,
        userId: memberId,
        joindAt: new Date(),
      })),
      "Error Adding Members To Group",
    );
    // Emit Socket Event

    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(true, "Members Added Successfully", null));
  },
);

// Socket Event in Group member Addition
// const memberAdded = (io: any, socket: Socket, data: {}) => {
//   return socket.to();
// };

// Remove Members From Group
/*
This is A Socket Event
Client send userId and GroupId To Remove Members => server Validate User => server emit a socket event to client with user details and message
validate user being already added in group
*/
export const removeMembers = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const groupId: number = Number(req.params?.id);
    const { members } = req.body as { members: number[] };

    // Check if the Groups exist or not
    const isExitedGroup = await new Query(Conversation).exists(
      eq(Conversation.conversationId, groupId),
    );

    if (!isExitedGroup) return next(new ApiError("Group Not Found", 404));
    // Check Whether members (Contact) Use Platform or not and check whether they are on your Contact
    for (const member of members) {
      const [foundMember] = await new Query(User).innerJoin(
        Contact,
        {
          id: User.id,
          name: User.username,
          phoneNumber: User.phoneNumber,
          contactId: Contact.contactId,
        },

        eq(User.phoneNumber, Contact.phoneNumber),
        eq(Contact.userId, member),
        "User is not registered in your contacts or not registered in platform",
      );
      console.log(foundMember);

      // Check Whether members is aleardy in group
      const isUserInGroup = await new Query(ConversatiomMem).exists(
        and(
          eq(ConversatiomMem.conversationId, groupId),
          eq(ConversatiomMem.userId, foundMember.id),
        ),
      );

      if (!isUserInGroup)
        return next(new ApiError("User is not in group", 400));
    }

    for (const memberId of members) {
      await new Query(ConversatiomMem).delete(
        and(
          eq(ConversatiomMem.conversationId, groupId),
          eq(ConversatiomMem.userId, memberId),
        ),
      );
    }
    // Emit Socket Event

    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(true, "Members Removed Successfully", null));
  },
);
// Think About This Later
export const deleteGroupChat = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const groupId: number = Number(req.params?.id);
    const userId: number = Number(req.user?.id);

    // Check if the Groups exist or not
    const isExitedGroup = await new Query(Conversation).exists(
      eq(Conversation.conversationId, groupId),
    );
    if (!isExitedGroup) return next(new ApiError("Group Not Found", 404));

    // Check Whether members is aleardy in group
    const isUserInGroup = await new Query(ConversatiomMem).exists(
      and(
        eq(ConversatiomMem.conversationId, groupId),
        eq(ConversatiomMem.userId, userId),
      ),
    );

    if (!isUserInGroup) return next(new ApiError("User is not in group", 400));

    await new Query(ConversatiomMem).update(
      {
        clearedAt: new Date(),
      },
      and(
        eq(ConversatiomMem.conversationId, groupId),
        eq(ConversatiomMem.userId, userId),
      ),
    );

    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(true, "Group Deleted Successfully", null));
  },
);

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
      "There is no Groups",
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
  async (req: any, res: Response, next: NextFunction) => {
    const groupId: number = Number(req.params?.id);
    console.log(groupId);
    const userId: number = req.user?.id as number;
    const groupExists = await new Query(Conversation).exists(
      eq(Conversation.conversationId, groupId),
    );

    if (!groupExists) return next(new ApiError("Group Not Found", 404));

    const result = await db
      .select({
        groupName: Conversation.group_name,
        groupPic: Conversation.group_pic,
        groupPicId: Conversation.group_pic_id,
        adminsOnly: Conversation.adminsOnly,
        admin: ConversatiomMem.admin,
        message: Message.messageID,
        sender: Recipients.sender,
        reciever: Recipients.reciever,
        messageContent: Message.content,
        messageMedia: Message.media_url,
        messageMediaType: Message.media_type,
        messageMediaSize: Message.media_size,
      })
      .from(Conversation)
      .innerJoin(
        ConversatiomMem,
        eq(Conversation.conversationId, ConversatiomMem.conversationId),
      )
      .innerJoin(
        Message,
        eq(Conversation.conversationId, Message.conversationId),
      )
      .innerJoin(Recipients, eq(Message.messageID, Recipients.messageId))
      .where(
        and(
          eq(Conversation.conversationId, groupId),
          eq(ConversatiomMem.userId, userId),
          or(eq(Recipients.sender, userId), eq(Recipients.reciever, userId)),
          or(
            lt(ConversatiomMem.clearedAt, Message.operatedAt),
            isNull(ConversatiomMem.clearedAt),
          ),
        ),
      )
      .orderBy(asc(Message.operatedAt));

    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(true, "Group Fetched Successfully", result));
  },
);

// Exit Group means Deleting Group from your group list and also deleting your userId from group members
export const exitGroupChat = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const groupId: number = Number(req.params?.id);
    const userId: number = Number(req.user?.id);

    // Check if The Group Exist or not
    const isExitedGroup = await new Query(Conversation).exists(
      eq(Conversation.conversationId, groupId),
    );

    if (!isExitedGroup) return next(new ApiError("Group Not Found", 404));

    // Check Whether members is aleardy in group
    const [userInGroup] = await new Query(ConversatiomMem).getOne(
      {
        userId: ConversatiomMem.userId,
        joinedAt: ConversatiomMem.joindAt,
      },
      and(
        eq(ConversatiomMem.userId, userId),
        eq(ConversatiomMem.conversationId, groupId),
        isNull(ConversatiomMem.leftAt),
      ),
      "User is not member of this group",
    );

    // Check Whether The User is admin or not
    // If Not Admin just update Left At Date
    // If Admin update admin false and left at date and if there's no admin in group assign new admin role to user
    const isAdmin = await new Query(ConversatiomMem).exists(
      and(
        eq(ConversatiomMem.conversationId, groupId),
        eq(ConversatiomMem.userId, userId),
        eq(ConversatiomMem.admin, true),
      ),
    );

    if (!isAdmin) {
      await new Query(ConversatiomMem).update(
        { leftAt: new Date() },
        and(
          eq(ConversatiomMem.conversationId, groupId),
          eq(ConversatiomMem.userId, userId),
        ),
      );
      return res
        .status(StatusCodes.OK)
        .json(new ApiResponse(true, "Member Exited Successfully", null));
    } else {
      const admins = await new Query(Conversation).innerJoin(
        ConversatiomMem,
        {
          conversationId: Conversation.conversationId,
          userId: ConversatiomMem.userId,
          joindAt: ConversatiomMem.joindAt,
        },
        eq(Conversation.conversationId, ConversatiomMem.conversationId),
        and(
          eq(ConversatiomMem.admin, true),
          eq(ConversatiomMem.conversationId, groupId),
        ),
        "There is an error with innerJoin",
      );

      await new Query(ConversatiomMem).update(
        { admin: false, leftAt: new Date() },
        and(
          eq(ConversatiomMem.conversationId, groupId),
          eq(ConversatiomMem.userId, userId),
        ),
      );
      console.log(admins, admins.length);

      if (admins.length - 1 === 0) {
        const remainingMembers = await new Query(Conversation).innerJoin(
          ConversatiomMem,
          {
            conversationId: Conversation.conversationId,
            userId: ConversatiomMem.userId,
            joindAt: ConversatiomMem.joindAt,
          },
          eq(Conversation.conversationId, ConversatiomMem.conversationId),
          and(
            eq(Conversation.conversationId, groupId),
            ne(ConversatiomMem.userId, userId), // anyone but the person leaving
            isNull(ConversatiomMem.leftAt), // only members still in the group
          ),
          "There is no Other Person in Group",
        );

        // pick the earliest-joined remaining member as the new admin
        const olderUser = remainingMembers.sort(
          (a, b) =>
            new Date(a.joindAt).getTime() - new Date(b.joindAt).getTime(),
        )[0];

        if (!olderUser) {
          // Delete Group And Members
          await new Query(ConversatiomMem).delete(
            eq(ConversatiomMem.conversationId, groupId),
          );
          await new Query(Conversation).delete(
            eq(Conversation.conversationId, groupId),
          );
          return res
            .status(StatusCodes.OK)
            .json(new ApiResponse(true, "Group Deleted Successfully", null));
        }

        await new Query(ConversatiomMem).update(
          { admin: true },
          and(
            eq(ConversatiomMem.conversationId, groupId),
            eq(ConversatiomMem.userId, olderUser.userId),
          ),
        );

        return res
          .status(StatusCodes.OK)
          .json(
            new ApiResponse(true, "You've Exited Group Successfully", null),
          );
      }

      // admins.length > 0 — other admins already exist, nothing more to do
      return res
        .status(StatusCodes.OK)
        .json(new ApiResponse(true, "You've Exited Group Successfully", null));
    }
  },
);
