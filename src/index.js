const json2md = require("json2md");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const argv = yargs(hideBin(process.argv)).argv;
const core = require("@actions/core");

// call via node convert-json-to-markdown.js --file=scanresults.json

// add a custom converter for vulnerabilities
json2md.converters.vulnerabilities = function (input, json2md) {
  // convert input to a Markdown table
  var headers = [
    "ID",
    "Status",
    "CVSS",
    "Severity",
    "Package Name",
    "Package Version",
    "Published Date",
    "Discovered Date",
    "Grace Days",
    "Fix Date",
  ];
  var rows = input.map((vulnerability) => ({
    ID: vulnerability.id || "",
    Status: vulnerability.status || "",
    CVSS: vulnerability.cvss || "",
    Severity: vulnerability.severity || "",
    "Package Name": vulnerability.packageName || "",
    "Package Version": vulnerability.packageVersion || "",
    "Published Date": vulnerability.publishedDate || "",
    "Discovered Date": vulnerability.discoveredDate || "",
    "Grace Days": vulnerability.graceDays || "",
    "Fix Date": vulnerability.fixDate || "",
  }));
  return json2md({ table: { headers: headers, rows: rows } });
};

// read the json
var fs = require("fs");
var data = fs.readFileSync(
  argv.file ||
    core.getInput("results-json-path", { required: true }) ||
    "scanresults.json",
  "utf8",
);

// parse the JSON string to a JavaScript object
var obj = JSON.parse(data);

if (Array.isArray(obj.results) && obj.results.length > 0) {
  // use the custom converter for the first item in the results array
  var result = obj.results[0];
  if (result.vulnerabilities) {
    var markdownVulnerabilities = json2md({
      vulnerabilities: result.vulnerabilities,
    });

    // log the Markdown vulnerabilities to the console
    console.log(markdownVulnerabilities);

    // write the Markdown vulnerabilities to a file
    const twistlockVulnerabilityTable = "./twistlock-vulnerability-table.md";
    fs.writeFileSync(twistlockVulnerabilityTable, markdownVulnerabilities);
    core.setOutput("vulnerability-table", twistlockVulnerabilityTable);

    // count the number of vulnerabilities with each severity
    var severityCounts = result.vulnerabilities.reduce(
      (counts, vulnerability) => {
        var severity = vulnerability.severity;
        if (!counts[severity]) {
          counts[severity] = 0;
        }
        counts[severity]++;
        return counts;
      },
      {},
    );

    // convert the severityCounts object to a Markdown table
    var headers = ["Severity", "Count"];

    var severitySymbols = {
      critical: "‼️",
      important: "❌",
      high: "⛔️",
      medium: "⚠️",
      moderate: "⚠️",
      low: "🟡",
    };

    var rows = Object.keys(severityCounts).map((severity) => {
      var symbol = severitySymbols[severity] || "";
      return {
        Severity: `${symbol} ${severity}`,
        Count: severityCounts[severity],
      };
    });

    // simple version - comment out var severitySymbols through to this comment to use simple version
    // var rows = Object.keys(severityCounts).map(severity => ({ Severity: severity, Count: severityCounts[severity] }));

    var markdownSummary = json2md({ table: { headers: headers, rows: rows } });
    // log the Markdown table to the console
    console.log(markdownSummary);
    // write the Markdown table to a file
    const twistlockSummaryTable = "./twistlock-summary-table.md";
    fs.writeFileSync(twistlockSummaryTable, markdownSummary);
    core.setOutput("summary-table", twistlockSummaryTable);
  }
} else {
  console.log("obj.results is not an array");
}
