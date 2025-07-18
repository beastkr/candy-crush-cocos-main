import { _decorator, Component, instantiate, Node, Prefab, Sprite, Vec3 } from 'cc'
import GameConfig from '../constants/GameConfig'
import BoardState from './boardstates/BoardState'
import FallState from './boardstates/FallState'
import IdleState from './boardstates/IdleState'
import KillState from './boardstates/KillState'
import Diamond from './tile/Diamond'

const { ccclass, property } = _decorator

@ccclass('Match3Board')
class Match3Board extends Component {
    @property(Sprite)
    public cursor: Sprite | null = null
    @property(Prefab)
    private diamondPrefab: Prefab | null = null
    @property(Prefab)
    private brickPrefab: Prefab | null = null

    private state: { [key: string]: BoardState } = {}
    private currentState: BoardState | null = null
    public board: Diamond[][] = []
    constructor() {
        super()
        this.state = {
            idle: new IdleState(this),
            kill: new KillState(this),
            fall: new FallState(this),
        }
    }
    public getCurrentState() {
        return this.currentState
    }
    protected update(dt: number): void {
        this.currentState?.onUpdate()
    }
    protected start(): void {
        this.createBoard()
        this.switchState('idle')
    }

    public switchState(state: string) {
        console.log('switch tp: ', state)
        this.currentState?.onExit()
        this.currentState = this.state[state]
        this.currentState.onEnter()
    }

    private createBoard() {
        for (var y = 0; y < GameConfig.GridHeight; y++) {
            this.board[y] = []
            for (var x = 0; x < GameConfig.GridWidth; x++) {
                this.createBorder(x, y)
            }
        }
        for (var y = 0; y < GameConfig.GridHeight; y++) {
            this.board[y] = []
            for (var x = 0; x < GameConfig.GridWidth; x++) {
                this.board[y].push(this.addDiamond(x, y))
            }
        }
    }

    private createBorder(x: number, y: number) {
        const border = instantiate(this.brickPrefab) as Node | null
        this.node.addChild(border!)
        border?.setPosition(
            new Vec3(Match3Board.coordToPos(x, y).x, Match3Board.coordToPos(x, y).y, -1)
        )
    }
    private addDiamond(x: number, y: number): Diamond {
        const diamondNode = instantiate(this.diamondPrefab) as Node | null
        const diamond = diamondNode?.getComponent(Diamond)
        this.node.addChild(diamondNode!)
        diamond!.randomType()
        diamond?.setCoordinate(x, y)
        diamondNode?.setPosition(
            new Vec3(Match3Board.coordToPos(x, y).x, Match3Board.coordToPos(x, y).y)
        )
        return diamond!
    }

    static coordToPos(x: number, y: number): { x: number; y: number } {
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
    public getVerticleMatch(dia: Diamond, type: string = dia.getType()): Diamond[] {
        let temp: Diamond[] = []
        temp.push(dia)
        for (let i = 1; i < GameConfig.GridHeight; i++) {
            if (dia.getCoordinate().y + i < GameConfig.GridHeight) {
                const currentTile = this.board[dia.getCoordinate().y + i][dia.getCoordinate().x]
                if (currentTile && currentTile.getType() != dia.getType()) {
                    break
                }
                if (currentTile && currentTile.getType() === dia.getType()) {
                    temp.push(currentTile)
                }
            }
        }
        for (let i = 1; i < GameConfig.GridHeight; i++) {
            if (dia.getCoordinate().y - i >= 0) {
                const currentTile = this.board[dia.getCoordinate().y - i][dia.getCoordinate().x]
                if (currentTile && currentTile.getType() != dia.getType()) {
                    break
                }
                if (currentTile && currentTile.getType() === dia.getType()) {
                    temp.push(currentTile)
                }
            }
        }

        return temp.length >= 3 ? temp : []
    }
    public getHorizontalMatch(dia: Diamond, type: string = dia.getType()): Diamond[] {
        let temp: Diamond[] = []
        temp.push(dia)
        for (let i = 1; i < GameConfig.GridWidth; i++) {
            if (dia.getCoordinate().x + i < GameConfig.GridHeight) {
                const currentTile = this.board[dia.getCoordinate().y][dia.getCoordinate().x + i]
                if (currentTile && currentTile.getType() != dia.getType()) {
                    break
                }
                if (currentTile && currentTile.getType() === dia.getType()) {
                    temp.push(currentTile)
                }
            }
        }
        for (let i = 1; i < GameConfig.GridWidth; i++) {
            if (dia.getCoordinate().x - i >= 0) {
                const currentTile = this.board[dia.getCoordinate().y][dia.getCoordinate().x - i]
                if (currentTile && currentTile.getType() != dia.getType()) {
                    break
                }
                if (currentTile && currentTile.getType() === dia.getType()) {
                    temp.push(currentTile)
                }
            }
        }

        return temp.length >= 3 ? temp : []
    }

    public getMatch(dia: Diamond): Diamond[] {
        var verticleMatch = this.getVerticleMatch(dia)
        var horizontalMatch = this.getHorizontalMatch(dia)
        // console.log('Vertical Match:', verticleMatch.length)
        // console.log('Horizontal Match:', horizontalMatch.length)
        var hoz = []
        if (verticleMatch.length > 0)
            for (var i = 1; i < horizontalMatch.length; i++) {
                hoz.push(horizontalMatch[i])
            }
        else hoz = horizontalMatch
        return [...verticleMatch, ...hoz]
    }
    public checkAll(list: Diamond[][] = this.board) {
        let temp: Diamond[] = []
        list.forEach((element) => {
            element.forEach((tile) => {
                temp = [...this.getMatch(tile), ...temp]
            })
        })
        return temp
    }
}
export default Match3Board
