import { _decorator, tween, Vec3 } from 'cc'
import GameConfig from '../../constants/GameConfig'
import KillState from '../boardstates/KillState'
import Match3Board from '../Match3Board'
import Diamond from './Diamond'
import { SubTile } from './SubTile'
const { ccclass, property } = _decorator

@ccclass('ExplosionSubTile')
export class ExplosionSubTile extends SubTile {
    public getRelative(board: Match3Board): Diamond[] {
        const temp: Diamond[] = []
        const dir = [
            [-1, -1], // top-left
            [0, -1], // top
            [1, -1], // top-right
            [-1, 0], // left
            [1, 0], // right
            [-1, 1], // bottom-left
            [0, 1], // bottom
            [1, 1], // bottom-right
        ]

        for (const direction of dir) {
            if (
                this.diamond.getCoordinate().x + direction[0] < GameConfig.GridWidth &&
                this.diamond.getCoordinate().x + direction[0] >= 0 &&
                this.diamond.getCoordinate().y + direction[1] < GameConfig.GridHeight &&
                this.diamond.getCoordinate().y + direction[1] >= 0
            ) {
                temp.push(
                    board.board[this.diamond.getCoordinate().y + direction[1]][
                        this.diamond.getCoordinate().x + direction[0]
                    ]
                )
            }
        }

        return temp.filter((d) => !d.pending)
    }
    public launch(board: Match3Board): Promise<void>[] {
        this.diamond.exploEff!.active = true
        this.diamond.exploEff!.setScale(new Vec3())
        // if (!this.diamond.node.active) return []
        console.log('launch expl')
        const prom: Promise<void>[] = []
        const centerPos = this.diamond.node.position
        console.log(centerPos)
        const relative = this.getRelative(board)
        const excluded = new Set(relative.concat(this.diamond))
        prom.push(
            new Promise<void>((resolve) => {
                tween(this.diamond.exploEff!)
                    .to(0.9, { scale: new Vec3(30, 30) }) // return
                    .call(() => {
                        this.diamond.exploEff?.setScale(new Vec3())
                        this.diamond.exploEff!.active = false
                        resolve()
                    })
                    .start()
            })
        )
        prom.push(this.diamond.doShrink(0, 0.5, board, false))

        for (let y = 0; y < GameConfig.GridHeight; y++) {
            for (let x = 0; x < GameConfig.GridWidth; x++) {
                const dia = board.board[y][x]
                if (!dia || excluded.has(dia) || dia.getEffect() != 'tile' || dia.pending) continue

                const originalPos = dia.node.position.clone()
                const targetPos = originalPos
                    .clone()
                    .subtract(centerPos)
                    .normalize()
                    .multiplyScalar(30)
                    .add(originalPos)

                if (!dia.pushed) {
                    dia.pushed = true

                    if (!dia.originalPosition) {
                        dia.originalPosition = dia.node.position.clone()
                    }
                    const originalPos = dia.originalPosition
                    const targetPos = originalPos
                        .clone()
                        .subtract(centerPos)
                        .normalize()
                        .multiplyScalar(30)
                        .add(originalPos)

                    prom.push(
                        new Promise<void>((resolve) => {
                            tween(dia.node)
                                .to(0.3, { position: targetPos }) // move out
                                .to(0.3, { position: originalPos }, { easing: 'bounceOut' }) // return
                                .call(() => {
                                    dia.pushed = false
                                    dia.originalPosition = null // cleanup
                                    resolve()
                                })
                                .start()
                        })
                    )
                }
            }
        }
        const r = relative.filter((d) => d.getEffect() == 'tile').filter((d) => !d.pending)

        for (const dia of r) {
            if (dia.pending) continue
            dia.pending = true
            prom.push(dia.doShrink(0, 0.5, board))
        }
        const t = relative.filter((d) => d.getEffect() != 'tile').filter((d) => !d.pending)
        var count = 0
        for (const d of t) {
            count++
            prom.push(
                (async () => {
                    await Match3Board.delay(100 * count)
                    if (d.getEffect() != 'tile' && board.getCurrentState() instanceof KillState) {
                        await Promise.all([
                            (board.getCurrentState() as KillState).killMultipleGrid([d], false),
                        ])
                    }
                })()
            )
        }

        return prom
    }
}
