import { _decorator } from 'cc'
import Match3Board from '../Match3Board'
import Diamond from './Diamond'
import { SubTile } from './SubTile'
const { ccclass, property } = _decorator

@ccclass('RowSubTile')
export class RowSubTile extends SubTile {
    public getRelative(board: Match3Board): Diamond[] {
        return board.board[this.diamond.getCoordinate().y]
            .filter((d) => !d.pending)
            .filter((d) => d != this.diamond)
    }
    public launch(board: Match3Board): Promise<void>[] {
        const prom: Promise<void>[] = []
        return prom
    }
}
