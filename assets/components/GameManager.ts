import { _decorator, Component, instantiate, Node, Prefab, RichText, Sprite, Vec3 } from 'cc'
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
    @property(Prefab)
    public brickprefeb: Prefab | null = null
    static Score: number = 0

    @property(Sprite)
    private cursor: Sprite | null = null
    @property(RichText)
    private scoreText: RichText | null = null
    @property(Prefab)
    private roweff: Prefab | null = null
    private milestone: number = 500
    private milecheck = false
    static increase() {
        GameManager.Score += 10
    }
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

    protected async update(dt: number) {
        this.scoreText!.string = String(GameManager.Score)

        // if (GameManager.Score > this.milestone) {
        //     this.milecheck = true
        //     for (var tile of this.pool.getList()) {
        //         if (tile.getTilePosition().y != tile.node.position.y) {
        //             this.milecheck = false
        //         }
        //     }
        //     if (this.milecheck) {
        //         this.milestone *= 2
        //         this.grid.shuffling = true
        //         setTimeout(this.grid.shuffle, 500)
        //         await this.grid.shuffle()
        //         this.milecheck = false
        //     }
        // }
    }
    protected async start(): Promise<void> {
        this.pool?.setupPrefab(this.tilePrefab as Prefab)
        await this.createTable()
    }

    async createTable(): Promise<void> {
        for (let i = 0; i < GameConfig.GridHeight; i++) {
            for (let j = 0; j < GameConfig.GridWidth; j++) {
                const node = instantiate(this.brickprefeb) as Node | null
                this.node.addChild(node as Node)
                node?.setPosition(
                    new Vec3(this.getTilePosition(j, i).x, this.getTilePosition(j, i).y)
                )
            }
        }
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
        this.grid.canChoose = true
    }
    async Chose(tile: Tile): Promise<void> {
        this.grid.choosingTile = tile
        // if (!this.grid.canChoose) return
        if (tile.coords === this.firstChosen?.coords) {
            console.log('Tile already chosen, unchoosing it')
            this.unChose()
            return
        }
        if (!this.firstChosen) {
            this.cursor!.node.active = true
            this.cursor!.node.setPosition(this.grid.choosingTile!.node.position)
            this.firstChosen = tile
            tile.chose()
        } else {
            this.cursor!.node.active = false
            if (this.secondChosen) return
            this.secondChosen = tile
            tile.chose()
            this.unChose() // Unchoose immediately after selecting second tile
            await this.Move()
            this.tileUp()
        }
    }
    async Move(): Promise<void> {
        if (
            this.firstChosen &&
            this.secondChosen &&
            this.grid.canSwap(this.firstChosen, this.secondChosen)
        ) {
            await this.grid.swap(this.firstChosen, this.secondChosen)
            this.tileUp()
        }
    }
    public getTilePosition(x: number, y: number): { x: number; y: number } {
        return {
            x:
                (-GameConfig.GridWidth * GameConfig.TileWidth) / 2 +
                GameConfig.TileWidth / 2 +
                x * GameConfig.TileWidth,
            y: -(
                (-GameConfig.GridHeight * GameConfig.TileHeight) / 2 +
                GameConfig.TileHeight / 2 +
                y * GameConfig.TileHeight
            ),
        }
    }
}
