import { _decorator, Component, instantiate, Prefab, type Node } from 'cc'
import GameConfig from '../constants/GameConfig'
import { Tile } from './Tile'
const { ccclass, property } = _decorator
@ccclass('TilePool')
export default class TilePool extends Component {
    private tileList: Tile[] = []
    private tilePrefab: Prefab | null = null
    getFirst(): Tile {
        for (let i = 0; i < this.tileList.length; i++) {
            const tile = this.tileList[i]
            if (!tile.used) {
                tile.used = true
                tile.node.active = true
                return tile
            }
        }
        const node = instantiate(this.tilePrefab) as Node | null
        if (node === null) throw new Error('Tile prefab is not set up')
        const tile = node.getComponent(Tile) as Tile
        if (tile === null) throw new Error('Tile component is not found on the prefab')
        const randomTileType: string =
            GameConfig.CandyTypes[Math.floor(Math.random() * GameConfig.CandyTypes.length)]
        tile.setTileType(randomTileType)
        this.tileList.push(tile)
        tile.used = true
        return tile
    }
    setupPrefab(prefab: Prefab): void {
        this.tilePrefab = prefab
    }
    returnPool(tile: Tile): void {
        tile.node.active = false
        tile.used = false
    }
    initPool(n: number): void {
        for (let i = 0; i < n; i++) {
            if (this.tilePrefab) {
                const randomTileType: string =
                    GameConfig.CandyTypes[Math.floor(Math.random() * GameConfig.CandyTypes.length)]
                const node = instantiate(this.tilePrefab) as Node | null
                if (node === null) throw new Error('Tile prefab is not set up')
                const tile = node.getComponent(Tile) as Tile
                tile.setTileType(randomTileType)
                this.tileList.push(tile)
            }
        }
    }
    returnMultiple(list: Tile[]): void {}
    getList(): Tile[] {
        return this.tileList
    }
}
