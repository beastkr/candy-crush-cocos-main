import {
    _decorator,
    Color,
    Component,
    instantiate,
    Node,
    Prefab,
    RigidBody2D,
    Sprite,
    Vec2,
} from 'cc'
const { ccclass, property } = _decorator

@ccclass('Confetti')
export class Confetti extends Component {
    @property(Number)
    public speedX: number = 0
    @property(Number)
    public speedY: number = 0

    @property(Prefab)
    public confettiPrefab: Prefab | null = null
    private listConfetti: Node[] = []
    public init(n: number) {
        if (!this.confettiPrefab) {
            console.warn('Confetti prefab is not assigned!')
            return
        }

        for (let i = 0; i < n; i++) {
            const node = instantiate(this.confettiPrefab)
            node.active = false
            this.node.addChild(node)
            this.listConfetti.push(node)
        }
    }
    public launch() {
        this.reset()
        this.unscheduleAllCallbacks()

        for (const con of this.listConfetti) {
            con.active = true

            const rb = con.getComponent(RigidBody2D)
            if (!rb) continue

            const x = this.randomInt(-this.speedX, this.speedX)
            const y = this.randomInt(this.speedY, this.speedY + 100)

            rb.linearVelocity = new Vec2(x, y)
            rb.angularVelocity = this.randomInt(0, 45) // ✅ Xoay khi bay
            rb.linearDamping = 2 // Cản dần tốc độ bay
            rb.angularDamping = 1.5
            rb.gravityScale = 10 // hoặc 0.2 tùy bạn

            // ✅ Màu ngẫu nhiên
            const sprite = con.getComponent(Sprite)
            if (sprite) {
                sprite.color = new Color(
                    this.randomInt(0, 255),
                    this.randomInt(0, 255),
                    this.randomInt(0, 255),
                    255
                )
            }
        }

        this.scheduleOnce(() => {
            this.reset()
        }, 5)
    }

    public reset() {
        for (const con of this.listConfetti) {
            con.active = false

            // Reset velocity nếu cần
            const rb = con.getComponent(RigidBody2D)
            if (rb) {
                rb.linearVelocity = new Vec2(0, 0)
                rb.angularVelocity = 0
            }

            // Đặt lại vị trí về gốc nếu muốn (tuỳ mục đích)
            con.setPosition(0, 0)
        }
    }

    public randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min
    }
}
