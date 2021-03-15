const readline = require("readline");
const fs = require("fs");
const path = require("path");

module.exports = function loadKeys(environment) {
  return new Promise((resolve, reject) => {
    const dirPath = path.resolve(`third-party-keys/${environment}`);
    const files = fs.readdirSync(dirPath);
    const pairs = [];
    let fileReadCount = 0;
    for (let file of files) {
      const rl = readline.createInterface({
        input: fs.createReadStream(
          path.resolve(`third-party-keys/${environment}/${file}`)
        ),
        crlfDelay: Infinity
      });
      rl.on("line", line => {
        if (line.startsWith("//")) return; //ignore comments
        const equaltoIndex = line.indexOf("=");
        const key = `${file.toUpperCase()}_${line.substring(0, equaltoIndex)}`;
        const value = line.substring(equaltoIndex + 1);
        pairs.push({ key: key, value: value });
      });
      rl.on("close", _ => {
        fileReadCount++;
        if (fileReadCount == files.length) resolve(pairs);
      });
    }
  });
};
