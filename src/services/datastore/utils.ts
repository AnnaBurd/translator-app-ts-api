import fs from "fs";

export function writeToExistingOrCreateFile(
  filePath: string,
  data: string,
  header: string = ""
) {
  try {
    // Check if the file exists
    fs.accessSync(filePath, fs.constants.F_OK);

    // File exists, append the data
    fs.appendFileSync(filePath, data, { encoding: "utf8", mode: 0o666 });
  } catch (error) {
    // File doesn't exist, create it and write the data
    fs.writeFileSync(filePath, header, {
      encoding: "utf8",
    });
    fs.appendFileSync(filePath, data, { encoding: "utf8" });
  }
}

export function deleteFileIfExists(filePath: string) {
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    console.log(`Could not delete file ${filePath}: ${(err as Error).message}`);
  }
}
