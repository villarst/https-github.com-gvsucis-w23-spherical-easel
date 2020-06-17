---
title: Tool Use Tips
lang: en-US
---

# Tool Use Tips

::: tip Shift Key
Holding the <kbd>Shift</kbd> while using the mouse (pressing, dragging, clinking, or releasing) means that the action will be directed to the back of sphere.
:::

::: tip Mouse Events
Through out this documentation, **mouse press** (or **mouse down**) is the action of pressing the mouse button down at a location, **mouse release** (or **mouse up**) is the action of releasing the button at a location, **clicking** is the action of mouse press and mouse release at the same location, and **mouse dragging** or **dragging** or **clicking and dragging** is the action of mouse press at a location and mouse release at a different location.
:::

::: tip Snap To Point

When creating points with any tool that creates an object depending on points, Spherical Easel always assumes that if the user attempts to create

- a point _**near**_ a one-dimensional object, it is assumed that the user wanted the point created _**on**_ the object (i.e. in such a way the that point is constrained to be on the object). That is, the [Point On Object Tool](/tools/construction.html#point-on-object) was used.
- a point _**near**_ an intersection of two one-dimensional objects, the user would like the point to be an intersection of the objects. That is, the [Intersection Tool](/tools/construction.html#intersection) was used.
- a point _**near**_ an existing point, the user would like to use the nearby point and not create a new one.

These three features are a "snap to point" assumption that Spherical Easel always makes.

:::

::: tip Undo and Redo
If you don't like the results of an action you can click the Undo button in the upper left of the Sphere Canvas Panel or you can activate the Delete Tool and delete objects and try again.
:::

::: tip Selected Objects

All selected objects will glow (i.e. have a highlight color displayed in the background of the object).

:::