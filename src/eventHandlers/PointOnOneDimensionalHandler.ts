import Two from "two.js";
import Point from "@/plottables/Point";
import { AddPointCommand } from "@/commands/AddPointCommand";
import { DisplayStyle } from "@/plottables/Nodule";
import Highlighter from "./Highlighter";
import { SEPointOnOneDimensional } from "@/models/SEPointOnOneDimensional";
import { SEOneDimensional } from "@/types";

export default class PointOnOneDimensionalHandler extends Highlighter {
  /**
   * The parent of the point
   */
  private oneDimensional: SEOneDimensional | null = null;

  constructor(layers: Two.Group[]) {
    super(layers);
  }

  mousePressed(event: MouseEvent): void {
    //Select the oneDimensional object to put point on
    if (this.isOnSphere) {
      if (this.hitSELines.length > 0) {
        this.oneDimensional = this.hitSELines[0];
      } else if (this.hitSESegments.length > 0) {
        this.oneDimensional = this.hitSESegments[0];
      } else if (this.hitSECircles.length > 0) {
        this.oneDimensional = this.hitSECircles[0];
      }

      if (this.oneDimensional != null) {
        const newPoint = new Point();
        // Set the display to the default values
        newPoint.stylize(DisplayStyle.APPLYCURRENTVARIABLES);
        newPoint.adjustSize();

        // Create the model object for the new point and link them
        const vtx = new SEPointOnOneDimensional(newPoint, this.oneDimensional);
        vtx.locationVector = this.oneDimensional.closestVector(
          this.currentSphereVector
        );
        // Create and execute the command to create a new point for undo/redo
        new AddPointCommand(vtx).execute();

        this.oneDimensional = null;
      }
    }
  }

  mouseMoved(event: MouseEvent): void {
    // Highlight all nearby objects and update location vectors
    super.mouseMoved(event);
  }

  // eslint-disable-next-line
  mouseReleased(event: MouseEvent): void {}

  mouseLeave(event: MouseEvent): void {
    super.mouseLeave(event);
    // Reset the oneDimensional in preparation for another intersection.
    this.oneDimensional = null;
  }
}