/** @format */

import { Vector3 } from "three";
import Point from "@/plottables/Point";
import Line from "@/plottables/Line";
import { CommandGroup } from "@/commands/CommandGroup";
import { AddLineCommand } from "@/commands/AddLineCommand";
import Two from "two.js";
import { SEPoint } from "@/models/SEPoint";
import { SELine } from "@/models/SELine";
import { SEIntersectionPoint } from "@/models/SEIntersectionPoint";
import { DisplayStyle } from "@/plottables/Nodule";
import SETTINGS from "@/global-settings";
import Highlighter from "./Highlighter";
import { ConvertInterPtToUserCreatedCommand } from "@/commands/ConvertInterPtToUserCreatedCommand";
import { SEPointOnOneDimensional } from "@/models/SEPointOnOneDimensional";
import { AddPointCommand } from "@/commands/AddPointCommand";
import { AddIntersectionPointCommand } from "@/commands/AddIntersectionPointCommand";
import { AddPointOnOneDimensionalCommand } from "@/commands/AddPointOnOneDimensionalCommand";
import { SEOneDimensional, SEIntersectionReturnType } from "@/types";
import { UpdateMode } from "@/types";
import Label from "@/plottables/Label";
import { SELabel } from "@/models/SELabel";

export default class LineHandler extends Highlighter {
  /**
   * The starting vector location of the line
   */
  private startVector = new Vector3();
  /**
   * The plottable object needs only the normal vector to render the line. This is the normalVector of the temporary line
   */
  private normalVector = new Vector3(0, 0, 0);

  /**
   * The user is dragging to create a line
   */
  private isDragging: boolean;

  /**
   * The starting and ending SEPoints of the line. The possible parent of the startSEPoint
   */
  private startSEPoint: SEPoint | null = null;
  private endSEPoint: SEPoint | null = null;
  private startSEPointOneDimensionalParent: SEOneDimensional | null = null;

  /**
   * A temporary line to display while the user is creating a new line
   */
  private tempLine: Line;
  private isTemporaryLineAdded: boolean;
  /**
   * A temporary plottable (TwoJS) point created while the user is making the circles or segments
   */
  protected startMarker: Point;
  /**
   * A temporary plottable (TwoJS) point created while the user is making the circles or segments
   */
  protected endMarker: Point;
  /**
   * If the user starts to make a line and mouse press at a location on the sphere, then moves
   * off the canvas, then back inside the sphere and mouse releases, we should get nothing. This
   * variable is to help with that. Or if the user mouse press outside the canvas and mouse releases
   * on the canvas, nothing should happen.
   */
  private makingALine = false;

  /**
   * A temporary vector to help with normal vector computations
   */
  private tmpVector = new Vector3();

  /**
   * Make a line handler
   * @param layers The TwoGroup array of layer so plottable objects can be put into the correct layers for correct rendering
   */
  constructor(layers: Two.Group[]) {
    super(layers);
    // Create and style the temporary line
    this.tempLine = new Line();
    this.tempLine.stylize(DisplayStyle.ApplyTemporaryVariables);
    this.store.commit.addTemporaryNodule(this.tempLine);
    this.isTemporaryLineAdded = false;
    this.isDragging = false;
    // Create and style the temporary points marking the start/end of an object being created
    this.startMarker = new Point();
    this.startMarker.stylize(DisplayStyle.ApplyTemporaryVariables);
    this.store.commit.addTemporaryNodule(this.startMarker);
    this.endMarker = new Point();
    this.endMarker.stylize(DisplayStyle.ApplyTemporaryVariables);
    this.store.commit.addTemporaryNodule(this.endMarker);
  }
  //eslint-disable-next-line
  mousePressed(event: MouseEvent): void {
    // Do the mouse moved event of the Highlighter so that a new hitSEPoints array will be generated
    // otherwise if the user has finished making an new point, then *without* triggering a mouse move
    // event, mouse press will *not* select the newly created point. This is not what we want so we call super.mouseMove
    super.mouseMoved(event);
    if (this.isOnSphere) {
      // The user is making a line
      this.makingALine = true;

      // The user is dragging to add a line
      this.isDragging = true;

      // Decide if the starting location is near an already existing SEPoint or near a oneDimensional SENodule
      if (this.hitSEPoints.length > 0) {
        // Use an existing SEPoint to start the line
        const selected = this.hitSEPoints[0];
        this.startVector.copy(selected.locationVector);
        this.startSEPoint = this.hitSEPoints[0];
        this.startMarker.positionVector = selected.locationVector;
      } else if (this.hitSESegments.length > 0) {
        // The start of the line will be a point on a segment
        //  Eventually, we will create a new SEPointOneDimensional and Point
        this.startSEPointOneDimensionalParent = this.hitSESegments[0];
        this.startVector.copy(
          this.startSEPointOneDimensionalParent.closestVector(
            this.currentSphereVector
          )
        );
        this.startMarker.positionVector = this.startVector;
        this.startSEPoint = null;
      } else if (this.hitSELines.length > 0) {
        // The start of the line will be a point on a line
        //  Eventually, we will create a new SEPointOneDimensional and Point
        this.startSEPointOneDimensionalParent = this.hitSELines[0];
        this.startVector.copy(
          this.startSEPointOneDimensionalParent.closestVector(
            this.currentSphereVector
          )
        );
        this.startMarker.positionVector = this.startVector;
        this.startSEPoint = null;
      } else if (this.hitSECircles.length > 0) {
        // The start of the line will be a point on a circle
        //  Eventually, we will create a new SEPointOneDimensional and Point
        this.startSEPointOneDimensionalParent = this.hitSECircles[0];
        this.startVector.copy(
          this.startSEPointOneDimensionalParent.closestVector(
            this.currentSphereVector
          )
        );
        this.startMarker.positionVector = this.startVector;
        this.startSEPoint = null;
      } else {
        // The mouse press is not near an existing point or one dimensional object.
        //  Record the location in a temporary point (startMarker found in MouseHandler).
        //  Eventually, we will create a new SEPoint and Point
        this.startMarker.positionVector = this.currentSphereVector;
        this.startVector.copy(this.currentSphereVector);
        this.startSEPoint = null;
      }
      this.endMarker.positionVector = this.currentSphereVector;
    }
  }
  mouseMoved(event: MouseEvent): void {
    // Highlights the objects near the mouse event
    super.mouseMoved(event);
    if (this.isOnSphere) {
      if (this.isDragging) {
        // Do we need to show the temporary line?
        if (!this.isTemporaryLineAdded) {
          this.isTemporaryLineAdded = true;
          this.tempLine.addToLayers(this.layers);

          // Only add the start marker if the start point is going to be new or is non-user created intersection point
          if (
            this.startSEPoint == null ||
            (this.startSEPoint instanceof SEIntersectionPoint &&
              !this.startSEPoint.isUserCreated)
          ) {
            this.startMarker.addToLayers(this.layers);
          }
          this.endMarker.addToLayers(this.layers);
        }
        // Compute the normal vector from the this.startVector, the (old) normal vector and this.endVector
        // Compute a temporary normal from the two points' vectors
        this.tmpVector.crossVectors(this.startVector, this.currentSphereVector);

        // Check to see if the temporary normal is zero (i.e the start and end vectors are parallel -- ether
        // nearly antipodal or in the same direction)
        if (this.tmpVector.isZero()) {
          this.tmpVector
            .crossVectors(this.startVector, this.currentSphereVector)
            .normalize();
          if (this.normalVector.length() == 0) {
            // The normal vector is still at its initial value so can't be used to compute the next normal, so set the
            // the normal vector to an arbitrarily chosen vector perpendicular to the start vector
            this.tmpVector.set(1, 0, 0);
            this.tmpVector.crossVectors(this.startVector, this.tmpVector);
            if (this.tmpVector.isZero()) {
              this.tmpVector.set(0, 1, 0);
              // The cross or startVector and (1,0,0) and (0,1,0) can't *both* be zero
              this.tmpVector.crossVectors(this.startVector, this.tmpVector);
            }
          } else {
            // The start and end vectors align, compute  the next normal vector from the old normal and the start vector
            this.tmpVector.crossVectors(this.startVector, this.normalVector);
            this.tmpVector.crossVectors(this.tmpVector, this.startVector);
          }
        }
        this.normalVector.copy(this.tmpVector).normalize();

        // Set the normal vector to the line in the plottable object, this setter calls updateDisplay()
        this.tempLine.normalVector = this.normalVector;
        this.endMarker.positionVector = this.currentSphereVector;
      }
    } else if (this.isTemporaryLineAdded) {
      // Remove the temporary objects
      this.tempLine.removeFromLayers();
      this.startMarker.removeFromLayers();
      this.endMarker.removeFromLayers();
      this.isTemporaryLineAdded = false;
    }
  }
  mouseReleased(event: MouseEvent): void {
    this.isDragging = false;
    if (this.isOnSphere) {
      // Make sure the user didn't trigger the mouse leave event and is actually making a segment
      if (this.makingALine) {
        // If the mouse has moved enough create a line otherwise create a point
        if (
          this.startVector.angleTo(this.currentSphereVector) >
          SETTINGS.line.minimumLength
        ) {
          this.makeLine();
        } else {
          this.makePoint();
        }
        // remove the temporary line and markers and get ready for the next line
        this.tempLine.removeFromLayers();
        this.startMarker.removeFromLayers();
        this.endMarker.removeFromLayers();
        this.isTemporaryLineAdded = false;
        this.makingALine = false;
        this.startSEPoint = null;
        this.endSEPoint = null;
        this.startSEPointOneDimensionalParent = null;
      }
    }
  }

  mouseLeave(event: MouseEvent): void {
    super.mouseLeave(event);
    this.isDragging = false;
    if (this.isTemporaryLineAdded) {
      this.tempLine.removeFromLayers();
      this.startMarker.removeFromLayers();
      this.endMarker.removeFromLayers();
      this.isTemporaryLineAdded = false;
    }
    // Clear old points and values to get ready for creating the next segment.
    this.startSEPoint = null;
    this.endSEPoint = null;
    this.startSEPointOneDimensionalParent = null;
    this.normalVector.set(0, 0, 0);
    this.makingALine = false;
  }

  // Create a new line from the mouse event information
  private makeLine(): void {
    //Create a command group so this can be undone
    const lineGroup = new CommandGroup();

    if (this.startSEPoint === null) {
      // We have to create a new SEPointOnOneDimensional or SEPoint and Point
      const newStartPoint = new Point();
      // Set the display and size to the default values
      newStartPoint.stylize(DisplayStyle.ApplyCurrentVariables);
      newStartPoint.adjustSize();
      // Create the plottable label
      const newLabel = new Label();

      let vtx: SEPoint | SEPointOnOneDimensional | null = null;
      let newSELabel: SELabel | null = null;
      if (this.startSEPointOneDimensionalParent) {
        // Starting mouse press landed near a oneDimensional
        // Create the model object for the new point and link them
        vtx = new SEPointOnOneDimensional(
          newStartPoint,
          this.startSEPointOneDimensionalParent
        );
        newSELabel = new SELabel(newLabel, vtx);
        // Create and execute the command to create a new point for undo/redo
        lineGroup.addCommand(
          new AddPointOnOneDimensionalCommand(
            vtx,
            this.startSEPointOneDimensionalParent,
            newSELabel
          )
        );
      } else {
        // Starting mouse press landed on an open space
        vtx = new SEPoint(newStartPoint);
        newSELabel = new SELabel(newLabel, vtx);
        // Create and execute the command to create a new point for undo/redo
        lineGroup.addCommand(new AddPointCommand(vtx, newSELabel));
      }
      vtx.locationVector = this.startVector;
      // Set the initial label location
      this.tmpVector
        .copy(vtx.locationVector)
        .add(
          new Vector3(
            2 * SETTINGS.point.initialLabelOffset,
            SETTINGS.point.initialLabelOffset,
            0
          )
        )
        .normalize();
      newSELabel.locationVector = this.tmpVector;
      this.startSEPoint = vtx;
    } else if (
      this.startSEPoint instanceof SEIntersectionPoint &&
      !this.startSEPoint.isUserCreated
    ) {
      // Mark the intersection point as created, the display style is changed and the glowing style is set up
      lineGroup.addCommand(
        new ConvertInterPtToUserCreatedCommand(this.startSEPoint)
      );
    }

    // Check to see if the release location is near any points
    if (this.hitSEPoints.length > 0) {
      this.endSEPoint = this.hitSEPoints[0];
      if (
        this.endSEPoint instanceof SEIntersectionPoint &&
        !this.endSEPoint.isUserCreated
      ) {
        // Mark the intersection point as created, the display style is changed and the glowing style is set up
        lineGroup.addCommand(
          new ConvertInterPtToUserCreatedCommand(this.endSEPoint)
        );
      }
    } else {
      // We have to create a new Point for the end
      const newEndPoint = new Point();
      // Set the display and size to the default values
      newEndPoint.stylize(DisplayStyle.ApplyCurrentVariables);
      newEndPoint.adjustSize();
      // Create the plottable label
      const newLabel = new Label();

      let vtx: SEPoint | SEPointOnOneDimensional | null = null;
      let newSELabel: SELabel | null = null;
      if (this.hitSESegments.length > 0) {
        // The end of the line will be a point on a segment
        // Create the model object for the new point and link them
        vtx = new SEPointOnOneDimensional(newEndPoint, this.hitSESegments[0]);
        // Set the Location
        vtx.locationVector = this.hitSESegments[0].closestVector(
          this.currentSphereVector
        );
        newSELabel = new SELabel(newLabel, vtx);

        lineGroup.addCommand(
          new AddPointOnOneDimensionalCommand(
            vtx,
            this.hitSESegments[0],
            newSELabel
          )
        );
      } else if (this.hitSELines.length > 0) {
        // The end of the line will be a point on a line
        // Create the model object for the new point and link them
        vtx = new SEPointOnOneDimensional(newEndPoint, this.hitSELines[0]);
        // Set the Location
        vtx.locationVector = this.hitSELines[0].closestVector(
          this.currentSphereVector
        );
        newSELabel = new SELabel(newLabel, vtx);

        lineGroup.addCommand(
          new AddPointOnOneDimensionalCommand(
            vtx,
            this.hitSELines[0],
            newSELabel
          )
        );
      } else if (this.hitSECircles.length > 0) {
        // The end of the line will be a point on a circle
        vtx = new SEPointOnOneDimensional(newEndPoint, this.hitSECircles[0]);
        // Set the Location
        vtx.locationVector = this.hitSECircles[0].closestVector(
          this.currentSphereVector
        );
        newSELabel = new SELabel(newLabel, vtx);

        lineGroup.addCommand(
          new AddPointOnOneDimensionalCommand(
            vtx,
            this.hitSECircles[0],
            newSELabel
          )
        );
      } else {
        // The ending mouse release landed on an open space
        vtx = new SEPoint(newEndPoint);
        // Set the Location
        vtx.locationVector = this.currentSphereVector;
        newSELabel = new SELabel(newLabel, vtx);

        lineGroup.addCommand(new AddPointCommand(vtx, newSELabel));
      }
      this.endSEPoint = vtx;
      // Set the initial label location
      this.tmpVector
        .copy(vtx.locationVector)
        .add(
          new Vector3(
            2 * SETTINGS.point.initialLabelOffset,
            SETTINGS.point.initialLabelOffset,
            0
          )
        )
        .normalize();
      newSELabel.locationVector = this.tmpVector;
    }

    // Compute a temporary normal from the two points' vectors
    this.tmpVector.crossVectors(
      this.startSEPoint.locationVector,
      this.endSEPoint.locationVector
    );
    // Check to see if the temporary normal is zero (i.e the start and end vectors are parallel -- ether
    // nearly antipodal or in the same direction)
    if (this.tmpVector.isZero()) {
      // The start and end vectors align, compute the next normal vector from the old normal and the start vector
      this.tmpVector.crossVectors(
        this.startSEPoint.locationVector,
        this.normalVector
      );
      this.tmpVector.crossVectors(
        this.tmpVector,
        this.startSEPoint.locationVector
      );
    }
    this.normalVector.copy(this.tmpVector).normalize();

    // Set the normal vector to the line in the plottable object, this setter calls updateDisplay()
    this.tempLine.normalVector = this.normalVector;

    // Create the new line after the normalVector is set
    const newLine = this.tempLine.clone();
    // Stylize the new Line
    newLine.stylize(DisplayStyle.ApplyCurrentVariables);
    newLine.adjustSize();

    const newSELine = new SELine(
      newLine,
      this.startSEPoint,
      this.normalVector,
      this.endSEPoint
    );
    // Create the plottable label
    const newLabel = new Label();
    const newSELabel = new SELabel(newLabel, newSELine);
    this.tmpVector
      .addVectors(
        this.startSEPoint.locationVector,
        this.endSEPoint.locationVector
      )
      .normalize()
      .add(new Vector3(0, SETTINGS.line.initialLabelOffset, 0))
      .normalize();
    newSELabel.locationVector = this.tmpVector;

    lineGroup.addCommand(
      new AddLineCommand(
        newSELine,
        this.startSEPoint,
        this.endSEPoint,
        newSELabel
      )
    );

    // Determine all new intersection points and add their creation to the command so it can be undone
    this.store.getters
      .createAllIntersectionsWithLine(newSELine)
      .forEach((item: SEIntersectionReturnType) => {
        // Create the plottable label
        const newLabel = new Label();
        const newSELabel = new SELabel(newLabel, item.SEIntersectionPoint);
        // Set the initial label location
        this.tmpVector
          .copy(item.SEIntersectionPoint.locationVector)
          .add(
            new Vector3(
              2 * SETTINGS.point.initialLabelOffset,
              SETTINGS.point.initialLabelOffset,
              0
            )
          )
          .normalize();
        newSELabel.locationVector = this.tmpVector;

        lineGroup.addCommand(
          new AddIntersectionPointCommand(
            item.SEIntersectionPoint,
            item.parent1,
            item.parent2,
            newSELabel
          )
        );
        item.SEIntersectionPoint.showing = false; // do not display the automatically created intersection points
        newSELabel.showing = false;
      });
    lineGroup.execute();
  }
  /**
   * The user is attempting to make a line shorter than the minimum arc length
   * so create a point at the location of the start vector
   */
  private makePoint(): void {
    if (this.startSEPoint === null) {
      // we have to create a new SEPointOnOneDimensional or SEPoint and Point
      const newPoint = new Point();
      // Set the display to the default values
      newPoint.stylize(DisplayStyle.ApplyCurrentVariables);
      newPoint.adjustSize();
      const newLabel = new Label();

      let vtx: SEPoint | SEPointOnOneDimensional | null = null;
      let newSELabel: SELabel | null = null;
      if (this.startSEPointOneDimensionalParent) {
        // Starting mouse press landed near a oneDimensional
        // Create the model object for the new point and link them
        vtx = new SEPointOnOneDimensional(
          newPoint,
          this.startSEPointOneDimensionalParent
        );
        newSELabel = new SELabel(newLabel, vtx);
        // Create and execute the command to create a new point for undo/redo
        new AddPointOnOneDimensionalCommand(
          vtx,
          this.startSEPointOneDimensionalParent,
          newSELabel
        ).execute();
      } else {
        // Starting mouse press landed on an open space
        // we have to create a new point and it to the group/store
        vtx = new SEPoint(newPoint);
        newSELabel = new SELabel(newLabel, vtx);
        // Create and execute the command to create a new point for undo/redo
        new AddPointCommand(vtx, newSELabel).execute();
      }
      vtx.locationVector = this.startVector;
      // Set the initial label location
      this.tmpVector
        .copy(vtx.locationVector)
        .add(
          new Vector3(
            2 * SETTINGS.point.initialLabelOffset,
            SETTINGS.point.initialLabelOffset,
            0
          )
        )
        .normalize();
      newSELabel.locationVector = this.tmpVector;
    }
    if (
      this.startSEPoint instanceof SEIntersectionPoint &&
      !this.startSEPoint.isUserCreated
    ) {
      // Mark the intersection point as created, the display style is changed and the glowing style is set up
      new ConvertInterPtToUserCreatedCommand(this.startSEPoint).execute();
    }
  }

  activate(): void {
    // If there are exactly two (non-antipodal and not to near each other) SEPoints selected,
    // create a line with the two points
    if (this.store.getters.selectedSENodules().length == 2) {
      const object1 = this.store.getters.selectedSENodules()[0];
      const object2 = this.store.getters.selectedSENodules()[1];

      if (object1 instanceof SEPoint && object2 instanceof SEPoint) {
        // Create a new plottable Line
        const newLine = new Line();
        // Set the display to the default values
        newLine.stylize(DisplayStyle.ApplyCurrentVariables);
        newLine.adjustSize();
        const newLabel = new Label();

        this.tmpVector.crossVectors(
          object1.locationVector,
          object2.locationVector
        );
        // Check to see if the points are antipodal
        if (this.tmpVector.isZero()) {
          // They are antipodal, create an arbitrary normal vector
          this.tmpVector.set(1, 0, 0);
          this.tmpVector.crossVectors(object1.locationVector, this.tmpVector);
          if (this.tmpVector.isZero()) {
            this.tmpVector.set(0, 1, 0);
            // The cross of object1.locationVector, and (1,0,0) and (0,1,0) can't *both* be zero
            this.tmpVector.crossVectors(object1.locationVector, this.tmpVector);
          }
        }

        // Add the last command to the group and then execute it (i.e. add the potentially two points and the circle to the store.)
        const newSELine = new SELine(
          newLine,
          object1,
          this.tmpVector.normalize(),
          object2
        );
        // Update the newSECircle so the display is correct when the command group is executed
        newSELine.update({ mode: UpdateMode.DisplayOnly, stateArray: [] });

        const newSELabel = new SELabel(newLabel, newSELine);
        this.tmpVector
          .addVectors(object1.locationVector, object2.locationVector)
          .normalize()
          .add(new Vector3(0, SETTINGS.line.initialLabelOffset, 0))
          .normalize();
        newSELabel.locationVector = this.tmpVector;

        const lineCommandGroup = new CommandGroup();
        lineCommandGroup.addCommand(
          new AddLineCommand(newSELine, object1, object2, newSELabel)
        );

        // Generate new intersection points. These points must be computed and created
        // in the store. Add the new created points to the circle command so they can be undone.
        this.store.getters
          .createAllIntersectionsWithLine(newSELine)
          .forEach((item: SEIntersectionReturnType) => {
            // Create the plottable label
            const newLabel = new Label();
            const newSELabel = new SELabel(newLabel, item.SEIntersectionPoint);
            // Set the initial label location
            this.tmpVector
              .copy(item.SEIntersectionPoint.locationVector)
              .add(
                new Vector3(
                  2 * SETTINGS.point.initialLabelOffset,
                  SETTINGS.point.initialLabelOffset,
                  0
                )
              )
              .normalize();
            newSELabel.locationVector = this.tmpVector;

            lineCommandGroup.addCommand(
              new AddIntersectionPointCommand(
                item.SEIntersectionPoint,
                item.parent1,
                item.parent2,
                newSELabel
              )
            );
            item.SEIntersectionPoint.showing = false; // do not display the automatically created intersection points
            newSELabel.showing = false;
          });

        lineCommandGroup.execute();
      }
    }
    // Unselect the selected objects and clear the selectedObject array
    super.activate();
  }
}
