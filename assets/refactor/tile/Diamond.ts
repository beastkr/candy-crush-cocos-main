import {
    _decorator,
    AudioSource,
    Color,
    Component,
    instantiate,
    Node,
    ParticleSystem2D,
    Prefab,
    resources,
    Sprite,
    SpriteFrame,
    Tween,
    tween,
    TweenEasing,
    Vec3,
} from 'cc'
import GameConfig from '../../constants/GameConfig'
import Match3Board from '../Match3Board'
import { ColumnSubTile } from './ColumnSubTile'
import { ExplosionSubTile } from './Explosion'
import { RainBowSubTile } from './RainBowSubTile'
import { RowSubTile } from './RowSubTile'
import { SubTile } from './SubTile'

const { ccclass, property } = _decorator

@ccclass('Diamond')
class Diamond extends Component {
    public originalPosition: Vec3 | null = null

    public pushed = false
    public rowFX: Sprite[] = []
    @property(ParticleSystem2D)
    public particle: ParticleSystem2D | null = null
    @property(Sprite)
    private sprite: Sprite | null = null
    @property(Sprite)
    private light: Sprite | null = null
    @property(Prefab)
    private rowFXPrefab: Prefab | null = null
    @property(AudioSource)
    public sfx: AudioSource | null = null
    @property(Node)
    public exploEff: Node | null = null

    private coordinate: { x: number; y: number } = { x: 0, y: 0 }
    public lastcoordinate: { x: number; y: number } = { x: 0, y: 0 }
    private type: string = 'type1'
    private effect: string = 'tile'
    private onClickCallbacks: ((diamond: Diamond) => void)[] = []
    public staple: boolean = false
    public onKillCallbacks: ((diamond: Diamond) => void)[] = []
    private flipTween: Tween<Node> | null = null

    public hintTween: Tween<Sprite> | null = null
    public lightHintTween: Tween<Sprite> | null = null
    public pending: boolean = false
    private subTiles: { [key: string]: SubTile } = {
        row: new RowSubTile(this),
        column: new ColumnSubTile(this),
        explosion: new ExplosionSubTile(this),
        rainbow: new RainBowSubTile(this),
    }

    private currentSubTile: SubTile | null = null

    public getCoordinate(): { x: number; y: number } {
        return { x: this.coordinate.x, y: this.coordinate.y }
    }
    constructor() {
        super()
    }
    getSprite() {
        return this.sprite
    }
    protected update(dt: number): void {}

    public setCoordinate(x: number, y: number) {
        this.coordinate.x = x
        this.coordinate.y = y
    }

    public addOnKillCallback(callback: (diamond: Diamond) => void): void {
        this.onKillCallbacks.push(callback)
    }
    public emitOnKill(board: Match3Board): Promise<void>[] {
        return this.currentSubTile!.launch(board)
    }

    public getType(): string {
        return this.type
    }
    public setType(type: string): void {
        this.type = type

        if (this.sprite) this.sprite.color = GameConfig.CandyColor[type]
        this.lightOff()
    }
    public lightOn() {
        this.light!.color = new Color(
            this.sprite?.color.r,
            this.sprite?.color.g,
            this.sprite?.color.b,
            50
        )
    }
    public chose() {
        if (!this.flipTween) {
            this.flipTween = tween(this.sprite?.node)
                .to(0.2, { scale: new Vec3(1.25, 1.25) })
                .repeatForever(
                    tween()
                        .to(0.25, { eulerAngles: new Vec3(0, 0, 20) })
                        .to(0.5, { eulerAngles: new Vec3(0, 0, -20) })
                        .to(0.25, { eulerAngles: new Vec3(0, 0, 0) })
                )
                .start()
        } else {
            this.flipTween.start()
        }
    }
    public hint() {
        if (!this.sprite || !this.sprite.isValid) return
        if (!this.light || !this.light.isValid) return

        const startColor = this.sprite.color.clone()
        if (!this.hintTween)
            this.hintTween = tween(this.sprite)
                .repeatForever(
                    tween()
                        .to(0.2, {
                            color: new Color(startColor.r, startColor.g, startColor.b, 100),
                        })
                        .to(0.2, {
                            color: new Color(startColor.r, startColor.g, startColor.b, 255),
                        })
                )
                .start()
        else this.hintTween.start()
        if (!this.lightHintTween)
            this.lightHintTween = tween(this.light)
                .repeatForever(
                    tween()
                        .to(0.2, {
                            color: new Color(startColor.r, startColor.g, startColor.b, 50),
                        })
                        .to(0.2, {
                            color: new Color(startColor.r, startColor.g, startColor.b, 20),
                        })
                )
                .start()
        else this.lightHintTween.start()
    }
    public unhint() {
        if (!this.sprite || !this.sprite.isValid) return
        if (!this.light || !this.light.isValid) return

        const startColor = this.sprite.color.clone()
        this.lightHintTween?.stop()
        this.hintTween?.stop()
        this.lightOff()
        this.sprite.color = new Color(startColor.r, startColor.g, startColor.b, 255)
    }

    public release(): void {
        this.flipTween?.stop()

        tween(this.sprite?.node)
            .to(0.2, { scale: new Vec3(1, 1, 1) })
            .to(0.1, { eulerAngles: new Vec3(0, 0, 0) }, { easing: 'bounceOut' }) // Reset cleanly
            .start()
    }

    public lightOff() {
        this.light!.color = new Color(
            this.sprite?.color.r,
            this.sprite?.color.g,
            this.sprite?.color.b,
            20
        )
    }

    public getEffect(): string {
        return this.effect
    }

    public randomType(): void {
        const randomTileType: string =
            GameConfig.CandyTypes[Math.floor(Math.random() * GameConfig.CandyTypes.length)]
        this.node.setScale(new Vec3(1, 1, 1))
        this.setType(randomTileType)
        this.node.active = true
    }

    public addOnclickCallbacks(callback: (diamond: Diamond) => void): void {
        this.onClickCallbacks.push(callback)
    }

    public emitOnClick() {
        this.onClickCallbacks.forEach((callback) => {
            callback(this)
        })
    }

    public removeOnClickCallbacks() {
        this.onClickCallbacks = []
    }

    public rest() {
        this.node.active = false
    }
    public setEffect(eff: string) {
        this.effect = eff
        const spriteFrame = resources.get(`images/${eff}/spriteFrame`, SpriteFrame)
        this.sprite!.spriteFrame = spriteFrame
        if (eff != 'tile') this.currentSubTile = this.subTiles[eff]
        else this.currentSubTile = null
    }
    public createFX(board: Match3Board) {
        for (let i = 0; i < 2; i++) {
            const node = instantiate(this.rowFXPrefab) as Node | null
            const rowFXSprite = node?.getComponent(Sprite)
            if (node) board.node.addChild(node)
            if (rowFXSprite) this.rowFX.push(rowFXSprite)
        }
        console.log(this.rowFX)
    }
    public doShrink(
        newScale: number,
        duration: number = 0.4,
        board: Match3Board,
        disableAfer: boolean = true
    ): Promise<void> {
        // this.lastcoordinate = { x: this.coordinate.x, y: this.coordinate.y }
        this.particle!.startColor = this.light!.color = new Color(
            this.sprite?.color.r,
            this.sprite?.color.g,
            this.sprite?.color.b,
            50
        )
        if (disableAfer) this.pending = true
        this.particle?.resetSystem()
        return new Promise<void>((resolve: Function) => {
            tween(this.sprite!.node)
                .to(duration, { scale: new Vec3(newScale, newScale) }, { easing: 'sineIn' })
                .call(() => {
                    Match3Board.increase()
                    resolve()
                })
                .start()
        })
    }
    public getRelative(board: Match3Board): Diamond[] {
        return this.currentSubTile?.getRelative(board) || []
    }
    public move(
        targetX: number,
        targetY: number,
        duration: number = 0.7,
        easing: TweenEasing = 'bounceOut'
    ): Promise<void> {
        return new Promise<void>((resolve: Function) => {
            tween(this.node)
                .to(duration, { position: new Vec3(targetX, targetY) }, { easing: easing })
                .call(() => resolve())
                .start()
        })
    }
}
export default Diamond
