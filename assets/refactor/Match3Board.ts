import { _decorator, AudioSource, Component, instantiate, Node, Prefab, Sprite, Vec3 } from 'cc'
import GameConfig from '../constants/GameConfig'
import BoardState from './boardstates/BoardState'
import FallState from './boardstates/FallState'
import IdleState from './boardstates/IdleState'
import KillState from './boardstates/KillState'
import PauseState from './boardstates/PauseState'
import ShuffleState from './boardstates/ShuffleState'
import { Confetti } from './Confetti'
import Diamond from './tile/Diamond'

const { ccclass, property } = _decorator

@ccclass('Match3Board')
class Match3Board extends Component {
    public isOver: boolean = false
    @property(Node)
    public starPos: Node[] = []
    @property(Node)
    public boardNode: Node | null = null
    @property(Sprite)
    public cursor: Sprite | null = null
    @property(Prefab)
    private diamondPrefab: Prefab | null = null
    @property(Prefab)
    public brickPrefab: Prefab | null = null
    @property(Node)
    public bgNode: Node | null = null
    public pausing = false
    public mileStone: number = 1000
    public turn = 10
    @property(Confetti)
    public confetti: Confetti | null = null
    @property(AudioSource)
    public sfx: AudioSource | null = null
    @property(AudioSource)
    public diaSFX: AudioSource | null = null

    static score: number = 0
    static SoundOn: boolean = true
    public highscore: number = 0

    public launchConfetti() {
        this.confetti?.launch()
    }

    private state: { [key: string]: BoardState } = {}
    private currentState: BoardState | null = null
    public board: Diamond[][] = []
    constructor() {
        super()
        this.state = {
            idle: new IdleState(this),
            kill: new KillState(this),
            fall: new FallState(this),
            shuffle: new ShuffleState(this),
            pause: new PauseState(this),
        }
    }
    public isGameOver() {
        return this.turn <= 0
    }

    public getHighscore() {
        this.highscore = Number(localStorage.getItem('highscore')) || 0
    }
    public setHighscore() {
        if (Match3Board.score > this.highscore) {
            this.highscore = Match3Board.score
            localStorage.setItem('highscore', String(Match3Board.score))
        }
    }
    public getCurrentState() {
        return this.currentState
    }
    public pause() {
        this.switchState('pause')
        this.pausing = true
    }
    public unpause() {
        if (this.pausing) {
            this.pausing = false
            this.switchState('fall')
        }
    }
    public disableBG() {
        this.bgNode!.active = false
    }
    public enableBG() {
        this.bgNode!.active = true
    }
    protected update(dt: number): void {
        // console.log(this.currentState)
        // if (Match3Board.SoundOn && !this.sfx?.playing) this.sfx?.play()
        // this.launchConfetti()
        this.currentState?.onUpdate()
    }
    protected start(): void {
        this.confetti?.init(100)
        if (!Match3Board.SoundOn) this.sfx?.pause()
        else this.sfx?.play()
        Match3Board.score = 0
        this.createBoard()
        this.switchState('shuffle')
        this.getHighscore()
    }

    public async switchState(state: string, first?: boolean, dia?: Diamond[]) {
        if (this.pausing) return
        console.log('switch tp: ', state)
        this.currentState?.onExit()
        this.currentState = this.state[state]
        await this.currentState.onEnter(first, dia)
    }

    private createBoard() {
        this.node?.addChild(this.cursor!.node)
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
    public canPause() {
        return !(this.currentState instanceof ShuffleState && !this.pausing)
    }

    private createBorder(x: number, y: number) {
        const border = instantiate(this.brickPrefab) as Node | null
        this.bgNode!.addChild(border!)
        border?.setPosition(
            new Vec3(Match3Board.coordToPos(x, y).x, Match3Board.coordToPos(x, y).y, -1)
        )
    }
    private addDiamond(x: number, y: number): Diamond {
        const diamondNode = instantiate(this.diamondPrefab) as Node | null
        const diamond = diamondNode?.getComponent(Diamond)
        this.boardNode?.addChild(diamondNode!)
        diamond!.randomType()
        diamond?.setCoordinate(x, y)
        diamond!.lastcoordinate = { x: x, y: y }
        diamond?.createFX(this)
        // diamondNode?.setPosition(
        //     new Vec3(Match3Board.coordToPos(x, y).x, Match3Board.coordToPos(x, y).y)
        // )
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
    public getProgress(): number {
        return Match3Board.score / this.mileStone > 1 ? 1 : Match3Board.score / this.mileStone
    }
    static increase() {
        Match3Board.score += 10
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
    public getNeighbors(x: number, y: number): Diamond[] {
        const dirs = [
            [0, 1],
            [1, 0],
            [0, -1],
            [-1, 0],
        ]
        const neighbors: Diamond[] = []
        for (const [dx, dy] of dirs) {
            const nx = x + dx
            const ny = y + dy
            if (nx >= 0 && nx < this.board[0].length && ny >= 0 && ny < this.board.length) {
                neighbors.push(this.board[ny][nx])
            }
        }
        return neighbors
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

    static delay(time: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, time))
    }
}
export default Match3Board
