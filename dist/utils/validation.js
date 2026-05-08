"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFirstValidationMessage = getFirstValidationMessage;
function getFirstValidationMessage(error, fallback = "Invalid request data") {
    return error.issues[0]?.message ?? fallback;
}
