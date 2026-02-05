import path from "path";

//Data folder path, finding it relative to this (./backend/web/ -> ./data/)
//process.cwd() gives us the root of the project, which I should've used in database handler its much more reliable
export const DATA_FOLDER_PATH = path.resolve(process.cwd(), "data");
