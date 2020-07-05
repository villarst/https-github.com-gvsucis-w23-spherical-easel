/** @format */

import Two from "two.js";
import { Matrix4, Vector3, LessStencilFunc, BooleanKeyframeTrack } from "three";
import MouseHandler from "./MouseHandler";
import { SEPoint } from "@/models/SEPoint";
import Segment from "@/plottables/Segment";
import Point from "@/plottables/Point";
import globalSettings from "@/global-settings";
import { CommandGroup } from "@/commands/CommandGroup";
import { AddPointCommand } from "@/commands/AddPointCommand";
import { AddSegmentCommand } from "@/commands/AddSegmentCommand";
import { AddSegmentMidPointCommand } from "@/commands/AddSegmentMidPointCommand";
import { SESegment } from "@/models/SESegment";
import SETTINGS from "@/global-settings";
import { SEIntersectionPoint } from "@/models/SEIntersectionPoint";
import { DisplayStyle } from "@/plottables/Nodule";
import { ShowPointCommand } from "@/commands/ShowPointCommand";
import { SESegmentMidPoint } from "@/models/SESegmentMidPoint";

const MIDPOINT_MOVEMENT_THRESHOLD = (2.0 * Math.PI) / 180;

/** A temporary vector to help with calculations */
const tmpVector1 = new Vector3();
const tmpVector2 = new Vector3();
const tmpTwoVector = new Two.Vector(0, 0);

//For debugging the tool
const midMarker = new Two.Circle(0, 0, 5);
midMarker.fill = "navy";

export default class SegmentHandler extends MouseHandler {
  /**
   * The starting vector location of the segment
   */
  private startVector = new Vector3();

  /**
   * The ending vector location of the segment (only used when the start and end are nearly Antipodal)
   */
  private endVector = new Vector3();
  /**
   * This indicates if the temporary segment has been added to the scene and made permanent
   */
  private isTemporarySegmentAdded = false;
  /**
   * The (model) start and end SEPoints of the line segment
   */
  private startSEPoint: SEPoint | null = null;
  private endSEPoint: SEPoint | null = null;
  /**
   * Indicates if the user is dragging
   */
  private dragging = false;
  /**
   * A temporary segment to display while the user is creating a segment
   */
  private tempSegment: Segment;

  /**
   * If the user starts to make a segment and mouse press at a location on the sphere, then moves
   * off the canvas, then back inside the sphere and mouse releases, we should get nothing. This
   * variable is to help with that.
   */
  private makingASegment = false;
  /**
   *  The location on the ideal unit sphere of the previous location of the mouse event
   */
  private startScreenVector = new Two.Vector(0, 0);
  private longerThanPi = false;
  private nearlyAntipodal = false; //If the startVector and the currentSpherePoint are nearly antipodal

  /** The midVector and temporary midVector */
  private midVector = new Vector3();
  private tempMidVector = new Vector3(); // This holds a candidate midpoint vector to see so that if updating the segment moves the midpoint too much
  private anchorMidVector = new Vector3();

  constructor(layers: Two.Group[]) {
    super(layers);
    this.tempSegment = new Segment();
    this.tempSegment.stylize(DisplayStyle.TEMPORARY);
  }

  mousePressed(event: MouseEvent): void {
    // The user is making a segment
    this.makingASegment = true;

    // The user is dragging
    this.dragging = true;
    // The Selection Handler forms a list of all the nearby points
    // If there are nearby points, select the first one to be the start of the segment otherwise
    //  put a startmarker (a Point found in MouseHandler) in the scene
    if (this.hitPoints.length > 0) {
      const selected = this.hitPoints[0];
      this.startVector.copy(selected.vectorPosition);
      this.startSEPoint = selected;
    } else {
      this.startMarker.addToLayers(this.layers);
      this.startMarker.positionVector = this.currentSphereVector;
      this.startVector.copy(this.currentSphereVector);
      this.startSEPoint = null;
    }
    this.startSEPoint = null;
    // Initially the midpoint is the start point
    this.midVector.copy(this.currentSphereVector);
    this.anchorMidVector.copy(this.currentSphereVector);

    this.nearlyAntipodal = false;
    this.longerThanPi = false;

    // The previous sphere point is the current one initially TODO: NEEDED?
    this.startScreenVector.copy(this.currentScreenVector);

    // The start vector of the temporary segment is also the the current location on the sphere
    this.tempSegment.startVector = this.currentSphereVector;
  }

  mouseMoved(event: MouseEvent): void {
    // Highlights the objects near the mouse event
    super.mouseMoved(event);

    // If the mouse event is on the sphere and the user is dragging.
    if (this.isOnSphere) {
      if (this.dragging) {
        // This is executed once per segment to be added
        if (!this.isTemporarySegmentAdded) {
          this.isTemporarySegmentAdded = true;
          // Add the temporary segment to the midground
          this.tempSegment.addToLayers(this.layers);

          // Debugging only -- add the mid marker
          this.canvas.add(midMarker);
        }
        // //New Test case Start ///////////////////////
        // // do different things if the the startVector and the currentSpherePoint are almost antipodal
        // // proceed with caution

        // if (
        //   this.currentScreenVector.distanceTo(
        //     tmpTwoVector.copy(this.startScreenVector).multiplyScalar(-1)
        //   ) <
        //   2 * SETTINGS.point.hitPixelDistance
        // ) {
        //   this.nearlyAntipodal = true;
        //   this.anchorMidVector.copy(this.midVector);
        // } else {
        //   if (
        //     this.nearlyAntipodal &&
        //     this.anchorMidVector.angleTo(this.currentSphereVector) > Math.PI / 2
        //   ) {
        //     this.longerThanPi = true;
        //   }
        //   if (
        //     this.nearlyAntipodal &&
        //     this.anchorMidVector.angleTo(this.currentSphereVector) < Math.PI / 2
        //   ) {
        //     this.longerThanPi = false;
        //   }
        //   this.nearlyAntipodal = false;
        // }
        // console.log("NAP", this.nearlyAntipodal);
        // // The value of longerThanPi is correctly set so use that to create a candidate midVector
        // this.tempMidVector
        //   .addVectors(this.startVector, this.currentSphereVector)
        //   .multiplyScalar(0.5)
        //   .normalize()
        //   .multiplyScalar(this.longerThanPi ? -1 : 1);

        // if (!this.nearlyAntipodal) {
        //   this.midVector.copy(this.tempMidVector);
        //   this.endVector.copy(this.currentSphereVector);
        // } else {
        //   // moveAngle is angular change in the midpoint (from midVector to tempMidVector)
        //   //const moveAngle = this.tempMidVector.angleTo(this.midVector);

        //   // Move the midpoint within a circle about the anchorMidVector so the user believes she is
        //   // moving the endpoint, but is really moving the midpoint

        //   tmpVector1.subVectors(
        //     this.currentSphereVector,
        //     tmpVector2.copy(this.startVector).multiplyScalar(-1)
        //   );
        //   this.midVector
        //     .addVectors(this.anchorMidVector, tmpVector1)
        //     .normalize();

        //   const arcLength = 2 * this.startVector.angleTo(this.midVector);

        //   tmpVector1.crossVectors(this.startVector, this.midVector).normalize();
        //   // tempVector =  normalize(N x oldMid) (notice that tempVector, N, oldMid are a unit orthonormal frame)
        //   tmpVector1.cross(this.midVector).normalize();
        //   // Now rotate in the oldMid, tempVector plane by the moveAngle (strangely this
        //   // works better than angle = MIDPOINT_MOVEMENT_THRESHOLD )
        //   // That is newMid = cos(angle)oldMid + sin(angle) tempVector
        //   tmpVector2.copy(this.startVector);
        //   tmpVector2.multiplyScalar(Math.cos(arcLength));
        //   tmpVector2
        //     .addScaledVector(tmpVector1, Math.sin(arcLength))
        //     .normalize();
        //   this.endVector.copy(tmpVector2);
        // }
        // OLD -- works but can we do better?
        if (this.startVector.angleTo(this.currentSphereVector) > 2) {
          // The startVector and the currentSpherePoint might be antipodal proceed with caution, possibly update longerThanPi
          if (
            this.currentScreenVector.distanceTo(
              tmpTwoVector.copy(this.startScreenVector).multiplyScalar(-1)
            ) < SETTINGS.point.hitPixelDistance
          ) {
            this.nearlyAntipodal = true;
            this.anchorMidVector.copy(this.midVector);
          } else {
            if (this.nearlyAntipodal) {
              this.longerThanPi = !this.longerThanPi;
            }
            this.nearlyAntipodal = false;
          }
        }

        console.log("Nearly AP", this.nearlyAntipodal);
        // The value of longerThanPi is correctly set so use that to create a candidate midVector
        this.tempMidVector
          .addVectors(this.startVector, this.currentSphereVector)
          .multiplyScalar(0.5)
          .normalize()
          .multiplyScalar(this.longerThanPi ? -1 : 1);

        // moveAngle is angular change in the midpoint (from midVector to tempMidVector)
        let moveAngle = this.tempMidVector.angleTo(this.midVector);
        if (moveAngle.toDegrees() < MIDPOINT_MOVEMENT_THRESHOLD) {
          // For small movement, update the midpoint directly
          this.midVector.copy(this.tempMidVector);
          this.endVector.copy(this.currentSphereVector);
        } else {
          // For target movement, update the midpoint along the tangent curve
          // N = normalize(midVector X tempMidVector)
          tmpVector1
            .crossVectors(this.midVector, this.tempMidVector)
            .normalize();
          // tempVector =  normalize(N x oldMid) (notice that tempVector, N, oldMid are a unit orthonormal frame)
          tmpVector1.cross(this.midVector).normalize();
          // Now rotate in the oldMid, tempVector plane by the moveAngle (strangely this
          // works better than angle = MIDPOINT_MOVEMENT_THRESHOLD )
          // That is newMid = cos(angle)oldMid + sin(angle) tempVector
          moveAngle = Math.min(
            moveAngle,
            Math.PI - moveAngle,
            MIDPOINT_MOVEMENT_THRESHOLD
          );
          console.log("move angle", moveAngle);

          this.midVector.multiplyScalar(Math.cos(moveAngle));
          this.midVector
            .addScaledVector(tmpVector1, Math.sin(moveAngle))
            .normalize();
          // Set the end vector
          const arcLength = 2 * this.startVector.angleTo(this.midVector);

          tmpVector1.crossVectors(this.startVector, this.midVector).normalize();
          // tempVector =  normalize(N x oldMid) (notice that tempVector, N, oldMid are a unit orthonormal frame)
          tmpVector1.cross(this.startVector).normalize();
          // Now rotate in the oldMid, tempVector plane by the moveAngle (strangely this
          // works better than angle = MIDPOINT_MOVEMENT_THRESHOLD )
          // That is newMid = cos(angle)oldMid + sin(angle) tempVector
          tmpVector2.copy(this.startVector);
          tmpVector2.multiplyScalar(Math.cos(arcLength));
          tmpVector2
            .addScaledVector(tmpVector1, Math.sin(arcLength))
            .normalize();
          this.endVector.copy(tmpVector2);
        }
        // Debugging midpoint only
        midMarker.translation
          .set(this.midVector.x, this.midVector.y)
          .multiplyScalar(globalSettings.boundaryCircle.radius);

        // The user can override this algorithm and make the midVector it antipode
        // if (event.ctrlKey) {
        //   this.midVector.multiplyScalar(-1);
        // }

        // Finally set the values for the unit vectors defining the segment and update the display
        this.tempSegment.midVector = this.midVector;
        this.tempSegment.endVector = this.endVector;
        this.tempSegment.normalVector = tmpVector1
          .crossVectors(this.startVector, this.midVector)
          .normalize();
        this.tempSegment.update();

        //this.previousScreenPoint.copy(this.currentScreenPoint);
      }
    } else if (this.isTemporarySegmentAdded) {
      //if not on the sphere and the temporary segment has been added remove the temporary objects
      this.tempSegment.removeFromLayers();
      this.startMarker.removeFromLayers();
      midMarker.remove();
      this.isTemporarySegmentAdded = false;
    }
  }

  mouseReleased(event: MouseEvent): void {
    this.dragging = false;
    if (this.isOnSphere) {
      //If the release event was on the sphere remove the temporary objects
      this.tempSegment.removeFromLayers();
      this.startMarker.removeFromLayers();
      midMarker.remove();
      // Make sure the user didn't trigger the mouse leave event and is actually making a segment
      if (this.makingASegment) {
        // Before making a new segment make sure that the user has dragged a non-trivial distance
        // If the user hasn't dragged far enough merely insert a point at the start location
        if (
          this.startVector.angleTo(this.currentSphereVector) >
          SETTINGS.segment.minimumArcLength
        ) {
          this.makeSegment();
        } else {
          this.makePoint();
        }
      }
      // Clear old points and values to get ready for creating the next segment.
      this.startSEPoint = null;
      this.endSEPoint = null;
      this.nearlyAntipodal = false;
      this.longerThanPi = false;
      this.makingASegment = false;
    }
  }

  mouseLeave(event: MouseEvent): void {
    super.mouseLeave(event);
    this.dragging = false;
    if (this.isTemporarySegmentAdded) {
      this.tempSegment.removeFromLayers();
      this.startMarker.removeFromLayers();
      midMarker.remove();
      this.isTemporarySegmentAdded = false;
    }
    // Clear old points and values to get ready for creating the next segment.
    this.startSEPoint = null;
    this.endSEPoint = null;
    this.nearlyAntipodal = false;
    this.longerThanPi = false;
    this.makingASegment = false;
  }

  private makeSegment(): void {
    // Clone the temporary segment and mark it added to the scene
    this.isTemporarySegmentAdded = false;
    const newSegment = this.tempSegment.clone();
    // Stylize the new segment
    newSegment.stylize(DisplayStyle.DEFAULT);
    // Set Up the glowing segment
    newSegment.stylize(DisplayStyle.GLOWING);

    // Create a new command group to store potentially three commands. Those to add the endpoints (which might be  new) and the segment itself.
    const segmentGroup = new CommandGroup();
    if (this.startSEPoint === null) {
      // The start point is a new point and must be created and added to the command/store
      const newStartPoint = new Point();
      // Set the display to the default values
      newStartPoint.stylize(DisplayStyle.DEFAULT);
      // Set the glowing display
      newStartPoint.stylize(DisplayStyle.GLOWING);
      const vtx = new SEPoint(newStartPoint);
      vtx.vectorPosition = this.startVector;
      this.startSEPoint = vtx;
      segmentGroup.addCommand(new AddPointCommand(vtx));
    } else if (this.startSEPoint instanceof SEIntersectionPoint) {
      segmentGroup.addCommand(new ShowPointCommand(this.startSEPoint));
    }
    if (this.hitPoints.length > 0) {
      // The end point is an existing point
      this.endSEPoint = this.hitPoints[0];
      if (this.endSEPoint instanceof SEIntersectionPoint) {
        segmentGroup.addCommand(new ShowPointCommand(this.endSEPoint));
      }
    } else {
      // The endpoint is a new point and must be created and added to the command/store
      const newEndPoint = new Point();
      // Set the display to the default values
      newEndPoint.stylize(DisplayStyle.DEFAULT);
      // Set up the glowing display
      newEndPoint.stylize(DisplayStyle.GLOWING);
      const vtx = new SEPoint(newEndPoint);
      vtx.vectorPosition = this.currentSphereVector;
      this.endSEPoint = vtx;
      segmentGroup.addCommand(new AddPointCommand(vtx));
    }

    // The midpoint is a new point and must be created and added to the command/store
    const newMidPoint = new Point();
    // Set the display to the default values
    newMidPoint.stylize(DisplayStyle.DEFAULT);
    // Set the glowing display
    newMidPoint.stylize(DisplayStyle.GLOWING);
    const newSEMidPoint = new SESegmentMidPoint(
      newMidPoint,
      this.startSEPoint,
      this.endSEPoint
    );
    newSEMidPoint.vectorPosition = this.midVector;
    segmentGroup.addCommand(new AddSegmentMidPointCommand(newSEMidPoint));

    const newSESegment = new SESegment(
      newSegment,
      this.startSEPoint,
      newSEMidPoint,
      this.endSEPoint
    );
    segmentGroup.addCommand(new AddSegmentCommand(newSESegment));
    this.store.getters
      .determineIntersectionsWithSegment(newSESegment)
      .forEach((p: SEIntersectionPoint) => {
        p.setShowing(false);
        segmentGroup.addCommand(new AddPointCommand(p));
      });
    segmentGroup.execute();
  }

  private makePoint(): void {
    // The user is attempting to make a segment smaller than the minimum arc length so
    // create  a point at the location of the start vector
    if (this.startSEPoint === null) {
      // Starting point landed on an open space
      // we have to create a new point and it to the group/store
      const newPoint = new Point();
      // Set the display to the default values
      newPoint.stylize(DisplayStyle.DEFAULT);
      // Set the glowing display
      newPoint.stylize(DisplayStyle.GLOWING);
      const vtx = new SEPoint(newPoint);
      vtx.vectorPosition = this.startVector;
      this.startSEPoint = vtx;
      const addPoint = new AddPointCommand(vtx);
      addPoint.execute();
    }
  }
}
