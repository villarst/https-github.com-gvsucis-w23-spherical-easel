/** This class uses the Command Design Pattern to
 * wrap actions into objects.
 * The most important abstract method of this class is the `do()`
 * method, it performs the action wrapped by the object
 *
 * In order to support undo feature, each command must also
 * implement the restoreState() method to revert the effects of the action.
 * The constructor of every subclass must take the arguments needed to perform
 * the actual action of the command.
 */

// import { Store } from "vuex";
// import { AppState } from "@/types";
import AppStore from "@/store";
import EventBus from "@/eventHandlers/EventBus";
import { SEPoint } from "@/models/SEPoint";
import { SELabel } from "@/models/SELabel";
import Point from "@/plottables/Point";
import { DisplayStyle } from "@/plottables/Nodule";
import Label from "@/plottables/Label";
import SETTINGS from "@/global-settings";
import { Vector3 } from "three";
export abstract class Command {
  protected static store = AppStore;

  //#region commmandArrays
  static commandHistory: Command[] = []; // stack of executed commands
  static redoHistory: Command[] = []; // stack of undone commands
  //#endregion commmandArrays

  //eslint-disable-next-line
  protected lastState: any; // The state can be of ANY type

  //#region undo
  static undo(): void {
    if (Command.commandHistory.length === 0) return;
    // Pop the last command from the history stack
    const lastAction: Command | undefined = Command.commandHistory.pop();
    // Run is restore state logic
    if (lastAction) {
      Command.redoHistory.push(lastAction);
      lastAction.restoreState();
    }
    // Update the free points to update the display so that individual command and visitors do
    // not have to update the display in the middle of undoing or redoing a command (this middle stuff causes
    // problems with the move *redo*)
    Command.store.commit.updateDisplay();
    EventBus.fire("undo-enabled", { value: Command.commandHistory.length > 0 });
    EventBus.fire("redo-enabled", { value: Command.redoHistory.length > 0 });
  }
  //#endregion undo

  static undoEnabled = (): boolean => Command.commandHistory.length > 0;
  static redoEnabled = (): boolean => Command.redoHistory.length > 0;

  //#region redo
  static redo(): void {
    if (Command.redoHistory.length === 0) return;
    const nextAction = Command.redoHistory.pop();

    if (nextAction) {
      nextAction.execute();
    }
    // Update the free points to update the display so that individual command and visitors do
    // not have to update the display in the middle of undoing or redoing a command (this middle stuff causes
    // problems with the move *redo*)
    Command.store.commit.updateDisplay();
  }
  //#endregion redo

  execute(): void {
    // Keep this command in the history stack
    Command.commandHistory.push(this);
    this.saveState(); /* Allow the command to save necessary data to restore later */
    this.do(); /* perform the actual action of this command */

    EventBus.fire("undo-enabled", { value: Command.commandHistory.length > 0 });
    EventBus.fire("redo-enabled", { value: Command.redoHistory.length > 0 });
  }

  /** Just memorize the command without actually executing it */
  push(): void {
    Command.commandHistory.push(this);
    this.saveState();

    EventBus.fire("undo-enabled", { value: Command.commandHistory.length > 0 });
    EventBus.fire("redo-enabled", { value: Command.redoHistory.length > 0 });
  }

  static dump(): string {
    return JSON.stringify(Command.commandHistory);
    // return (
    //   "[" +
    //   Command.commandHistory
    //     .map((c: Command, cPos: number) => {
    //       return JSON.stringify(c); //.replaceAll('"', "");
    //     })
    //     .join(",") +
    //   "]"
    // );
  }

  static makePointAndLabel(at: Vector3): { point: SEPoint; label: SELabel } {
    const newPoint = new Point();
    newPoint.stylize(DisplayStyle.ApplyCurrentVariables);
    newPoint.adjustSize();
    const point = new SEPoint(newPoint);
    point.locationVector.copy(at);

    const newLabel = new Label();
    const label = new SELabel(newLabel, point);
    label.locationVector.copy(at);
    const offset = SETTINGS.point.initialLabelOffset;
    label.locationVector.add(new Vector3(2 * offset, offset, 0)).normalize();
    return { point, label };
  }
  // Child classes of Command must implement the following abstract methods
  /**
   * restoreState: Perform necessary action to restore the app state.
   * The operation(s) implemented in restoreState() are usually opposite of the
   * operation(s) implemented in do()*/
  abstract restoreState(): void;

  // TODO: consider merging saveState() and do(). They are always invoked one after the other

  /** saveState: Save require information to restore the app state*/
  /**
   * The saveState() method allows a particular command to save necessary information needed for undoing when restoreState()  is invoked (later on). And saveState() is invoked before do() in case the command requires to use/retrieve information before the action itself takes place. One example that I can think of now: let’s say we will implement ChangeLineWidthCommand and its saveState() method would be able to query the current line width before it changes the line width to a new value.
   */
  abstract saveState(): void;

  /**  do: Perform necessary action to alter the app state*/
  abstract do(): void;
}

// This subclass of Command represents a command which can be saved
// as a "script". To properly re-execute each command. the string output
// of toJSON must include all the necessary information needed to invoke
// the constructor of a particular command class
export abstract class PersistableCommand extends Command {
  /* Reference 
      https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#tojson_behavior
  */
  /**
   * Invoke at runtime by JSON.stringify()
   *
   * @param arg takes one of the following values
   *    - a property name (if this class is used as a property of another object)
   *    - an empty string (if JSON.stringify() directly calls on this object)
   *    - an array index (if this object is an array, nat applicable to our case)
   */
  abstract toJSON(arg: string): string;
}
