import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameController')
export class GameController extends Component {
    public static instance: GameController | null = null


    public start(): void {
        if (!GameController.instance) {
            GameController.instance = this
            return
        }
        this.destroy()
    }
}


