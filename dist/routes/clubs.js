"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const clubController_1 = require("../controllers/clubController");
const chatControllers_1 = require("../controllers/chatControllers");
const requireAuth_1 = require("../middleware/requireAuth");
const router = express_1.default.Router();
// List clubs
router.get("/", clubController_1.getClubs);
// Create club
router.post("/", requireAuth_1.requireAuth, clubController_1.createClub);
//Join public club or request to join private club
router.post("/:id/join", requireAuth_1.requireAuth, clubController_1.joinClub);
// Cancel pending join request for a private club
router.delete("/:id/join-request", requireAuth_1.requireAuth, clubController_1.cancelJoinRequest);
//Leave a club
router.delete("/:id/member", requireAuth_1.requireAuth, clubController_1.leaveClub);
// Delete a club (owner only)
router.delete("/:id", requireAuth_1.requireAuth, clubController_1.deleteClub);
// Update club settings (owner only)
router.patch("/:id", requireAuth_1.requireAuth, clubController_1.updateClub);
// Get join requests for a club (owner/moderator only)
router.get("/:id/join-requests", requireAuth_1.requireAuth, clubController_1.getJoinRequests);
// Approve/reject join request (owner/moderator only)
router.patch("/:id/join-requests/:reqId", requireAuth_1.requireAuth, clubController_1.updateJoinRequest);
// Get club members (owner only)
router.get("/:id/members", requireAuth_1.requireAuth, clubController_1.getClubMembers);
// Update member role (owner only)
router.patch("/:id/members/:userId/role", requireAuth_1.requireAuth, clubController_1.updateMemberRole);
// Transfer ownership (owner only)
router.patch("/:id/ownership", requireAuth_1.requireAuth, clubController_1.transferClubOwnership);
// Get single club by ID
router.get("/:id", clubController_1.getClubById);
router.get("/:id/chat/messages", requireAuth_1.requireAuth, chatControllers_1.getMessages);
exports.default = router;
