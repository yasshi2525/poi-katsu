declare interface GameVars {
	mode: "multi" | "ranking",
	totalTimeLimit: number,
	gameState: {
		score: number
	},
	playerProfile: {
		name: string,
		avatar: string
	},
	allPlayersProfiles: {
		[playerId: string]: {
			name: string,
			avatar: string
		}
	},
	allPlayersScores: {
		[playerId: string]: number
	}
}

declare interface MessageData<T> {
	name: string;
	args: T
}
