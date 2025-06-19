declare interface GameVars {
	mode: "multi" | "ranking",
	totalTimeLimit: number,
	gameState: {
		score: number
	}
}

declare interface MessageData<T> {
	name: string;
	args: T
}
