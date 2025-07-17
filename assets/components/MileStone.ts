import { _decorator, Component } from 'cc'
import TilePool from './TilePool'
const { ccclass, property } = _decorator

@ccclass('MileStone')
export default class MileStone extends Component {
    @property(TilePool)
    private pool: TilePool | null = null

    form: { x: number; y: number }[] = []
}
