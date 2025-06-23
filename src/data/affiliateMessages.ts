import { SharedPostData } from "./sharedPostData";

/**
 * Message interface for broadcasting affiliate post sharing
 */
export interface AffiliateBroadcastMessage {
	/** ID of the player who shared the post */
	playerId: string;
	/** Name of the player who shared the post */
	playerName: string;
	/** The shared post data */
	sharedPost: SharedPostData;
}

/**
 * Message interface for broadcasting affiliate purchase notifications
 */
export interface AffiliatePurchaseMessage {
	/** ID of the shared post that was purchased */
	postId: string;
	/** ID of the player who made the purchase */
	buyerId: string;
	/** Name of the player who made the purchase */
	buyerName: string;
	/** ID of the player who shared the original post */
	sharerId: string;
	/** Reward points for the sharer */
	rewardPoints: number;
}
