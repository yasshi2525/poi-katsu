declare interface GameVars {
	gameState: {
		score: number
	},
}

declare interface MessageData<T> {
	name: string;
	args: T
}
