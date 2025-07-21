import BoardState from './BoardState'

class PauseState extends BoardState {
    promises: Promise<void>[] = []
    public onEnter(): void {}
    public onExit(): void {}
    public onUpdate(): void {}
}
export default PauseState
