import fs from "fs";
import path from "path";
import ApiError from "../helpers/ApiError.ts";

export const removePicsFromLocal = (filePath: string) => {
  try {
    const resolvedPath = path.resolve(filePath);
    fs.unlinkSync(resolvedPath);
  } catch (error) {
    console.log(error);
    throw new ApiError("Error Deleting Images From Local", 500);
  }
};
