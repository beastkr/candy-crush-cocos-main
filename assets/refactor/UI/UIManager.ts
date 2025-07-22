import { _decorator, Button, Component, Label, Node, ProgressBar, RichText, tween, Vec3 } from 'cc'
import Match3Board from '../Match3Board'
import IdleState from '../boardstates/IdleState'
const { ccclass, property } = _decorator

@ccclass('UIManager')
export class UIManager extends Component {
    @property(Match3Board)
    private board: Match3Board | null = null

    @property(Node)
    private pausePopUp: Node | null = null
    @property(Button)
    private continueButton: Button | null = null
    @property(Button)
    private pauseButton: Button | null = null
    @property(Button)
    private soundButton: Button | null = null
    @property(Label)
    private soundText: Label | null = null

    @property(Node)
    private gameOverPopup: Node | null = null
    @property(ProgressBar)
    private progressBar: ProgressBar | null = null
    @property(RichText)
    private scoreText: RichText | null = null
    @property(RichText)
    private highScoreText: RichText | null = null
    private idleState: IdleState | null = null
    @property(RichText)
    private gameOverScoreText: RichText | null = null
    @property(RichText)
    private remainTurnText: RichText | null = null

    update() {
        this.soundText!.string = 'Turn Sound ' + (Match3Board.SoundOn ? 'Off' : 'On')
        if (this.board?.isOver && this.gameOverPopup?.active == false) {
            this.gameOver()
        }
        if (!this.idleState && this.board?.getCurrentState() instanceof IdleState) {
            this.idleState = this.board.getCurrentState() as IdleState
        }
        this.remainTurnText!.string = 'Remain Turn: ' + String(this.board?.turn)
        this.pauseButton!.node.active = this.board!.canPause()
        this.progressBar!.progress = this.board!.getProgress()
        this.scoreText!.string = 'Score: ' + String(Match3Board.score)
    }
    public toggleSound() {
        Match3Board.SoundOn = !Match3Board.SoundOn
        if (Match3Board.SoundOn) this.board?.sfx?.play()
        else this.board?.sfx?.pause()
    }
    public pauseGame() {
        if (this.board?.pausing) return
        this.pausePopUp!.active = true
        const promises: Promise<void>[] = []
        promises.push(
            new Promise<void>((resolve) => {
                tween(this.pausePopUp!)
                    .to(0.8, { position: new Vec3() }, { easing: 'bounceOut' })
                    .call(() => {
                        resolve()
                    })
                    .start()
            })
        )
        Promise.all(promises).then(() => {
            this.board?.pause()
            this.pauseButton!.node.active = false
        })
    }
    public gameOver() {
        this.board?.setHighscore()
        this.highScoreText!.string = 'Highscore: ' + String(this.board!.highscore)
        this.gameOverScoreText!.string = 'Score: ' + String(Match3Board.score)
        this.board!.pausing = true

        this.gameOverPopup!.active = true
        const promises: Promise<void>[] = []
        promises.push(
            new Promise<void>((resolve) => {
                tween(this.gameOverPopup!)
                    .to(0.8, { position: new Vec3() }, { easing: 'bounceOut' })
                    .call(() => {
                        resolve()
                    })
                    .start()
            })
        )
        Promise.all(promises).then(() => {
            this.board?.pause()
            this.pauseButton!.node.active = false
        })
    }
    public unPauseGame() {
        const promises: Promise<void>[] = []
        promises.push(
            new Promise<void>((resolve) => {
                tween(this.pausePopUp!)
                    .to(0.5, { position: new Vec3(0, 900) }, { easing: 'sineIn' })
                    .call(() => {
                        resolve()
                    })
                    .start()
            })
        )
        Promise.all(promises).then(() => {
            this.board?.unpause()
            this.pauseButton!.node.active = true
            this.pausePopUp!.active = false
        })
    }

    public newGame() {
        // this.idleState?.onExit()
        // director.loadScene('GameScene-refactor')
        const promises: Promise<void>[] = []
        if (this.pausePopUp?.active == true)
            promises.push(
                new Promise<void>((resolve) => {
                    tween(this.pausePopUp!)
                        .to(0.5, { position: new Vec3(0, 900) }, { easing: 'sineIn' })
                        .call(() => {
                            resolve()
                        })
                        .start()
                })
            )
        if (this.gameOverPopup?.active == true)
            promises.push(
                new Promise<void>((resolve) => {
                    tween(this.gameOverPopup!)
                        .to(0.8, { position: new Vec3(0, 900) }, { easing: 'bounceOut' })
                        .call(() => {
                            resolve()
                        })
                        .start()
                })
            )
        Promise.all(promises).then(() => {
            this.board!.pausing = false
            this.board?.switchState('shuffle')
            Match3Board.score = 0
            this.board!.mileStone = 1000
            this.board!.turn = 10
        })
    }
}
