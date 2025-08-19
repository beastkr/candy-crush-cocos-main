import { _decorator, Component, Prefab } from 'cc'
import GameConfig from '../constants/GameConfig'
import { Tile } from './Tile'
import TileGrid from './TileGrid'
import TilePool from './TilePool'
const { ccclass, property } = _decorator

@ccclass('GameManager')
export default class GameManager extends Component {
    public static instance: GameManager | null = null
    @property(TileGrid)
    tilePool: TileGrid | null = null

    public start(): void {
        if (GameManager) {
            this.destroy()
            return
        }
        GameManager.instance = this
        this.setUp()
    }

    setUp() { }

}
