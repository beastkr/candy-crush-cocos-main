import { _decorator, Component, Prefab } from 'cc'
import GameConfig from '../constants/GameConfig'
import { Tile } from './Tile'
import TileGrid from './TileGrid'
import TilePool from './TilePool'
const { ccclass, property } = _decorator

@ccclass('GameManager')
export default class GameManager extends Component {
    @property(TileGrid)
    public grid: TileGrid = new TileGrid()
    @property(TilePool)
    public pool: TilePool = new TilePool()
    firstChosen: Tile | undefined = undefined
    secondChosen: Tile | undefined = undefined
    @property(Prefab)
    public tilePrefab: Prefab | null = null
    protected __preload(): void {
        if (!this.grid) {
            console.error('TileGrid is not assigned in GameManager')
        }
        if (!this.pool) {
            console.error('TilePool is not assigned in GameManager')
        }
        if (!this.tilePrefab) {
            console.error('TilePrefab is not assigned in GameManager')
        }
    }
    protected async start(): Promise<void> {
        this.pool?.setupPrefab(this.tilePrefab as Prefab)
        await this.createTable()
    }
    async createTable(): Promise<void> {
        this.pool?.initPool(GameConfig.GridHeight * GameConfig.GridWidth)
        this.pool?.getList().forEach((element) => {
            this.node.addChild(element.node)
        })
        this.grid?.initTable()
        await this.grid?.fillTable(this.pool as TilePool)
        this.grid?.setUpManager(this)
    }
    unChose(): void {
        this.grid.choosingTile = null
        if (this.firstChosen) {
            this.firstChosen.release()
        }
        if (this.secondChosen) {
            this.secondChosen.release()
        }
    }

    tileUp() {
        this.firstChosen = undefined
        this.secondChosen = undefined
    }
    async Chose(tile: Tile): Promise<void> {
        this.grid.choosingTile = tile
        if (!this.grid.canChoose) return
        if (tile.coords === this.firstChosen?.coords) {
            console.log('Tile already chosen, unchoosing it')
            this.unChose()
            return
        }
        if (!this.firstChosen) {
            this.firstChosen = tile
            tile.chose()
        } else {
            this.secondChosen = tile
            tile.chose()
            this.unChose() // Unchoose immediately after selecting second tile
            await this.Move()
        }
    }
    async Move(): Promise<void> {
        if (
            this.firstChosen &&
            this.secondChosen &&
            this.grid.canSwap(this.firstChosen, this.secondChosen)
        ) {
            await this.grid.swap(this.firstChosen, this.secondChosen)
        }
        this.tileUp()
    }
}
