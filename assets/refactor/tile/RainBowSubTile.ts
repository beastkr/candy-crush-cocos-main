import { _decorator, tween } from 'cc'
import KillState from '../boardstates/KillState'
import Match3Board from '../Match3Board'
import Diamond from './Diamond'
import { SubTile } from './SubTile'
const { ccclass, property } = _decorator

@ccclass('RainBowSubTile')
export class RainBowSubTile extends SubTile {
    public getRelative(board: Match3Board): Diamond[] {
        const temp: Diamond[] = []
        for (const row of board.board) {
            for (const d of row) {
                if (d.getType() == this.diamond.getType()) {
                    temp.push(d)
                }
            }
        }

        return temp.filter((d) => !d.pending).filter((d) => d != this.diamond)
    }
    public launch(board: Match3Board): Promise<void>[] {
        if (!this.diamond.node.active) return []

        const prom: Promise<void>[] = []

        const allRelatives = this.getRelative(board)
        const tileNormals = allRelatives.filter((d) => d.getEffect() == 'tile')
        const tileSpecials = allRelatives.filter(
            (d) => d.getEffect() != 'tile' && d.getType() != 'rainbow'
        )

        // Shrink rainbow sau cùng
        const shrinkRainbow = () => this.diamond.doShrink(0, 0.5, board, true)
        const p: Promise<void>[] = []
        // Tile thường: bay vào + shrink luôn
        for (const d of tileNormals) {
            // if (d.pushed) continue
            d.pushed = true
            p.push(
                new Promise<void>((resolve) => {
                    tween(d.node)
                        .to(0.3, { position: this.diamond.node.position })
                        .call(() => {
                            d.pushed = false
                            resolve()
                        })
                        .start()
                })
            )
            p.push(d.doShrink(0, 0.5, board))
        }

        prom.push(shrinkRainbow())
        // Tile đặc biệt: bay vào rainbow -> sau đó nhả ra lần lượt
        prom.push(
            (async () => {
                const moveIn: Promise<void>[] = []
                await Promise.all(p)
                let t = tileSpecials.filter((d) => !d.pending)
                for (const d of tileSpecials) {
                    if (!d.originalPosition) {
                        d.originalPosition = d.node.position.clone()
                    }
                    moveIn.push(
                        new Promise<void>((resolve) => {
                            tween(d.node)
                                .to(0.3, { position: this.diamond.node.position })
                                .call(() => resolve())
                                .start()
                        })
                    )
                }

                // await Promise.all(moveIn)
                var count = 0
                const testProm: Promise<void>[] = []
                t = tileSpecials.filter((d) => !d.pending)

                for (const d of tileSpecials) {
                    count++
                    // await Match3Board.delay(300)
                    // await new Promise<void>((resolve) => {
                    //     tween(d.node)
                    //         .to(0.3, { position: d.originalPosition! }, { easing: 'bounceOut' })
                    //         .call(() => {
                    //             d.originalPosition = null
                    //             resolve()
                    //         })
                    //         .start()
                    // })

                    if (board.getCurrentState() instanceof KillState) {
                        await (board.getCurrentState() as KillState).killMultipleGrid([d], false)
                    }
                }
            })()
        )

        return prom
    }
}
