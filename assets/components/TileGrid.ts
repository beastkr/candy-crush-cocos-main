import { _decorator, Component, Prefab, tween, Vec3 } from 'cc'
import GameConfig from '../constants/GameConfig'
import GameManager from './GameManager'
import { Tile } from './Tile'
import TilePool from './TilePool'
const { ccclass, property } = _decorator
@ccclass('TileGrid')
export default class TileGrid extends Component {
    board: Tile[][] = []
    @property(Prefab)
    tilePrefab: Prefab | null = null
    protected start(): void {

    }


}
