import { _decorator } from 'cc'
import GameConfig from '../../constants/GameConfig'
import Match3Board from '../Match3Board'
import Diamond from './Diamond'
import { SubTile } from './SubTile'
const { ccclass, property } = _decorator

@ccclass('ColumnSubTile')
export class ColumnSubTile extends SubTile {
    public getRelative(board: Match3Board): Diamond[] {
        const temp: Diamond[] = []
        for (let y = 0; y < GameConfig.GridHeight; y++) {
            temp.push(board.board[y][this.diamond.getCoordinate().x])
        }

        return temp.filter((d) => !d.pending).filter((d) => d != this.diamond)
    }
    public launch(board: Match3Board): Promise<void>[] {
        if (!this.diamond.node.active) return []
        const prom: Promise<void>[] = []

        return prom
    }
}
