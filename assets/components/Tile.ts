import {
    _decorator,
    Button,
    Component,
    Node,
    resources,
    Sprite,
    SpriteFrame,
    tween,
    Tween,
    TweenEasing,
    Vec3,
} from 'cc'

import GameConfig from '../constants/GameConfig'
const { ccclass, property } = _decorator

@ccclass('Tile')
export class Tile extends Component {
    @property(Sprite)
    private sprite: Sprite | null = null
    public used: boolean = false
    public coords: { x: number; y: number } = { x: 0, y: 0 }

    private tileType: string = GameConfig.CandyTypes[0]

    private callbacks: Array<(tile: Tile) => void> = []
    private flipTween: Tween<Node> | null = null

    protected __preload(): void {
        if (!this.sprite) throw new Error('Sprite is required')
    }

    public addOnClickCallback(callback: (tile: Tile) => void) {
        this.callbacks.push(callback)
    }

    public removeOnClickCallback(callback?: (tile: Tile) => void) {
        if (callback) {
            this.callbacks = this.callbacks.filter((c) => c !== callback)
        } else {
            this.callbacks = []
        }
    }

    /**
     * Referenced by button's click event handler
     * in the editor
     * */
    public emitOnClick() {
        for (const callback of this.callbacks) {
            callback(this)
        }
    }

    public getTileType(): string {
        return this.tileType
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
                        .call(() => {
                            console.log(this.node.getComponent(Button))
                        })
                )
                .start()
        } else {
            this.flipTween.start()
        }
    }

    public setTileType(tileType: string) {
        this.tileType = tileType
        const spriteFrame = resources.get(`images/tile/spriteFrame`, SpriteFrame)
        if (this.sprite) this.sprite.color = GameConfig.CandyColor[tileType]

        if (!spriteFrame) throw new Error(`Sprite frame for ${tileType} not found`)
        this.sprite!.spriteFrame = spriteFrame
    }

    protected onDestroy(): void {
        this.callbacks = []
    }
    public release(): void {
        this.flipTween?.stop()

        tween(this.sprite?.node)
            .to(0.2, { scale: new Vec3(1, 1, 1) })
            .to(0.1, { eulerAngles: new Vec3(0, 0, 0) }, { easing: 'bounceOut' }) // Reset cleanly
            .start()
    }
    public moveTo(
        x: number,
        y: number,
        scale: number = 1,
        duration: number = 0.3,
        style: TweenEasing = 'linear',
        bouncing: boolean = false,
        setNewPos: boolean = true
    ): Promise<void> {
        this.coords.x = x
        this.coords.y = y
        return new Promise((resolve) => {
            tween(this.node)
                .to(0.15, { scale: new Vec3(scale, scale, 1) }, { easing: style })
                .to(0.15, { scale: new Vec3(1, 1, 1) })
                .call(() => {
                    if (bouncing) {
                        tween(this.node)
                            .to(
                                (duration - 0.4) / 2,
                                { scale: new Vec3(1.25, 1.25, 1) },
                                { easing: 'bounceOut' }
                            )
                            .to((duration - 0.4) / 2, { scale: new Vec3(1, 1, 1) })
                            .start()
                    }
                })
                .start()
            tween(this.node)
                .to(
                    duration,
                    {
                        position: new Vec3(this.getTilePosition().x, this.getTilePosition().y, 0),
                    },
                    { easing: style }
                )
                .call(() => {
                    resolve()
                })
                .start()
        })
    }

    public Bounce(tile: Tile) {
        const tilePos: { x: number; y: number } = tile.getTilePosition()
        tween(this.node)
            .to(0.2, {
                position: new Vec3(tilePos.x, tilePos.y, 0),
            })
            .to(0.2, {
                position: new Vec3(this.getTilePosition().x, this.getTilePosition().y, 0),
            })
            .start()
    }
    resetPosToCoord() {
        this.node.setPosition(this.coords.x, this.coords.y, 0)
    }

    public getTilePosition(): { x: number; y: number } {
        return {
            x:
                (-GameConfig.GridWidth * GameConfig.TileWidth) / 2 +
                GameConfig.TileWidth / 2 +
                this.coords.x * GameConfig.TileWidth,
            y: -(
                (-GameConfig.GridHeight * GameConfig.TileHeight) / 2 +
                GameConfig.TileHeight / 2 +
                this.coords.y * GameConfig.TileHeight
            ),
        }
    }

    public rotateWhole(duration: number) {
        tween(this.node)
            .to(duration, { eulerAngles: new Vec3(0, 0, 90) })
            .call(() => {
                this.node.eulerAngles = new Vec3()
            })
            .start()
    }
}
