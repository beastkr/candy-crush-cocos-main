import { Component } from 'cc'
import Match3Board from '../Match3Board'
import Diamond from '../tile/Diamond'

abstract class BoardState extends Component {
    protected board: Match3Board
    constructor(board: Match3Board) {
        super()
        this.board = board
    }
    public abstract onEnter(first?: boolean, dia?: Diamond[]): void | Promise<void>
    public abstract onUpdate(): void
    public abstract onExit(): void
}
export default BoardState
