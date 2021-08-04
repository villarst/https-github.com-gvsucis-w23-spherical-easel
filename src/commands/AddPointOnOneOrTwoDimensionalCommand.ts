import { Command } from "./Command";
import { SEPoint } from "@/models/SEPoint";
import { SEOneOrTwoDimensional, UpdateMode } from "@/types";
import { SELabel } from "@/models/SELabel";
import SETTINGS from "@/global-settings";
import { SENodule } from "@/models/SENodule";
import { Vector3 } from "three";
import Point from "@/plottables/Point";
import { SEPointOnOneOrTwoDimensional } from "@/models/SEPointOnOneOrTwoDimensional";
import { DisplayStyle } from "@/plottables/Nodule";
import Label from "@/plottables/Label";

export class AddPointOnOneDimensionalCommand extends Command {
  private sePointOnOneOrTwoDimensional: SEPointOnOneOrTwoDimensional;
  private parent: SEOneOrTwoDimensional;
  private seLabel: SELabel;
  constructor(
    sePointOnOneDimensional: SEPointOnOneOrTwoDimensional,
    parent: SEOneOrTwoDimensional,
    seLabel: SELabel
  ) {
    super();
    this.sePointOnOneOrTwoDimensional = sePointOnOneDimensional;
    this.parent = parent;
    this.seLabel = seLabel;
  }

  do(): void {
    this.parent.registerChild(this.sePointOnOneOrTwoDimensional);
    this.sePointOnOneOrTwoDimensional.registerChild(this.seLabel);
    if (SETTINGS.point.showLabelsOfPointOnObjectInitially) {
      this.seLabel.showing = true;
    } else {
      this.seLabel.showing = false;
    }
    Command.store.addPoint(this.sePointOnOneOrTwoDimensional);
    Command.store.addLabel(this.seLabel);
    this.sePointOnOneOrTwoDimensional.update({
      mode: UpdateMode.DisplayOnly,
      stateArray: []
    });
  }

  saveState(): void {
    this.lastState = this.sePointOnOneOrTwoDimensional.id;
  }

  restoreState(): void {
    Command.store.removeLabel(this.seLabel.id);
    Command.store.removePoint(this.lastState);
    this.sePointOnOneOrTwoDimensional.unregisterChild(this.seLabel);
    this.parent.unregisterChild(this.sePointOnOneOrTwoDimensional);
  }

  toOpcode(): null | string | Array<string> {
    return [
      "AddPointOnOneDimensional",
      /* arg-1 */ this.sePointOnOneOrTwoDimensional.name,
      /* arg-2 */ this.sePointOnOneOrTwoDimensional.locationVector.toFixed(7),
      /* arg-3 */ this.parent.name,
      /* arg-4 */ this.seLabel.name,
      /* arg-5 */ this.sePointOnOneOrTwoDimensional.showing,
      /* arg-6 */ this.sePointOnOneOrTwoDimensional.exists
    ].join("/");
  }

  static parse(command: string, objMap: Map<string, SENodule>): Command {
    const tokens = command.split("/");
    const parentLine = objMap.get(tokens[3]) as
      | SEOneOrTwoDimensional
      | undefined;
    if (parentLine) {
      const pointPosition = new Vector3();
      pointPosition.from(tokens[2]);
      // const { point, label } = Command.makePointAndLabel(pointPosition); // We can't use this because we must create a SEPointOnOneDimensional and not just an SEPoint

      const newPoint = new Point();
      newPoint.stylize(DisplayStyle.ApplyCurrentVariables);
      newPoint.adjustSize();
      const point = new SEPointOnOneOrTwoDimensional(newPoint, parentLine);
      point.locationVector.copy(pointPosition);

      const newLabel = new Label();
      const label = new SELabel(newLabel, point);
      label.locationVector.copy(pointPosition);
      const offset = SETTINGS.point.initialLabelOffset;
      label.locationVector.add(new Vector3(2 * offset, offset, 0)).normalize();

      point.showing = tokens[5] === "true";
      point.exists = tokens[6] === "true";
      point.name = tokens[1];
      objMap.set(tokens[1], point);
      label.showing = tokens[5] === "true";
      label.exists = tokens[6] === "true";
      label.name = tokens[4];
      objMap.set(tokens[4], label);
      return new AddPointOnOneDimensionalCommand(point, parentLine, label);
    } else {
      throw new Error(
        `AddPointOnOneDimensional: parent object ${tokens[3]} is undefined`
      );
    }
  }
}