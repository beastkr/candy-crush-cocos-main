import { _decorator, Component } from 'cc'
import Match3Board from '../Match3Board'
import Diamond from './Diamond'
const { ccclass, property } = _decorator

@ccclass('SubTile')
export abstract class SubTile extends Component {
    protected diamond: Diamond
    constructor(dia: Diamond) {
        super()
        this.diamond = dia
    }
    public abstract getRelative(board: Match3Board): Diamond[]
    public abstract launch(board: Match3Board): Promise<void>[]
}
