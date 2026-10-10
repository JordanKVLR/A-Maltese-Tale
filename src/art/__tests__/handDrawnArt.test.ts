import { execFileSync } from "child_process";
import path from "path";

describe("hand-drawn art", () => {
  it("passes the SVG checker, and the bundled modules match the SVG files", () => {
    // Throws (with the checker's report) if any file breaks the rules or a module is stale.
    execFileSync("node", ["scripts/harsi-art.js", "build", "--check"], { cwd: path.join(__dirname, "../../.."), stdio: "pipe" });
  });
});
