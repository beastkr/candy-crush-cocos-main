import { _decorator, tween, Vec3 } from 'cc'
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
        for (const d of this.getRelative(board)) {
            prom.push(
                new Promise<void>((resolve) => {
                    tween(d.node)
                        .to(0.1, { scale: new Vec3(2, 2) })
                        .to(0.3, { position: this.diamond.node.position })
                        .call(() => resolve())
                        .start()
                })
            )
        }

        return prom
    }
}
