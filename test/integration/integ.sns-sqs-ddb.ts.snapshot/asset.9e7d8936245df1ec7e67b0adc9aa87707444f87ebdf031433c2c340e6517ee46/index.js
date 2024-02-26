"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/functions/sqs-ddb-function.ts
var sqs_ddb_function_exports = {};
__export(sqs_ddb_function_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(sqs_ddb_function_exports);
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var client = new import_client_dynamodb.DynamoDBClient({});
function parseData(data) {
  if (typeof data === "object")
    return data;
  if (typeof data === "string")
    return JSON.parse(data);
  return data;
}
async function handler(event) {
  const updatedRecords = [];
  const failedRecords = [];
  for (const record of event.Records) {
    const body = parseData(record.body);
    const message = parseData(body.Message);
    const putItem = new import_client_dynamodb.PutItemCommand({
      Item: {
        id: { S: message.id },
        message: { S: message.message },
        additionalAttr: { S: "enriched" }
      },
      TableName: process.env.TABLE_NAME
    });
    try {
      await client.send(putItem);
      updatedRecords.push(message.id);
    } catch (e) {
      console.log(e);
      failedRecords.push(message.id);
    }
  }
  const statusCode = failedRecords.length == 0 ? 200 : 500;
  return {
    statusCode,
    updatedRecords: JSON.stringify(updatedRecords),
    failedRecords: JSON.stringify(failedRecords)
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
