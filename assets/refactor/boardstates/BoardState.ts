import Match3Board from '../Match3Board'

abstract class BoardState {
    protected board: Match3Board
    constructor(board: Match3Board) {
        this.board = board
    }
    public abstract onEnter(): void | Promise<void>
    public abstract onUpdate(): void
    public abstract onExit(): void
}
export default BoardState
