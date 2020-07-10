import { Visitor } from "./Visitor";
import { SEPoint } from "@/models/SEPoint";
import { SELine } from "@/models/SELine";
import { Matrix4, Vector3, Matrix3 } from "three";
import { SECircle } from "@/models/SECircle";
import { SESegment } from "@/models/SESegment";

export class PositionVisitor implements Visitor {
  private transformMatrix: Matrix4 = new Matrix4();
  private normalMatrix: Matrix3 = new Matrix3();
  private tmpVector: Vector3 = new Vector3();

  setTransform(m: Matrix4): void {
    this.transformMatrix.copy(m);
    this.normalMatrix.getNormalMatrix(this.transformMatrix);
  }

  //#region actionOnPoint
  actionOnPoint(p: SEPoint): void {
    this.tmpVector.copy(p.vectorPosition); // Copy the old vector location of the SEPoint
    this.tmpVector.applyMatrix4(this.transformMatrix); // Apply the matrix
    p.vectorPosition = this.tmpVector; // Set the new position vector
  }
  //#endregion actionOnPoint

  /* These are calledshould never be called because lines are always children of points */
  actionOnLine(m: SELine): void {
    m.update();
  }

  actionOnSegment(s: SESegment): void {
    s.update();
  }

  actionOnCircle(c: SECircle): void {
    this.tmpVector.copy(c.normalDirection);
    this.tmpVector.applyMatrix4(this.transformMatrix);
    c.normalDirection = this.tmpVector;
  }
}
