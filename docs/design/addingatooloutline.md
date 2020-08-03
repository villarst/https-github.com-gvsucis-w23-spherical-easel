---
title: Adding A Tool
---

# Adding A Tool

There are two different type of tools in Sphere Easel: those that create new geometric objects based on user mouse input and those that use existing geometric and measurement objects to control the location of an existing kind of object object (i.e. point, line segment, line, circle, or ellipse). The former tools are called New Object Tools and the later are called Control Tools

## Adding a Control Tool

This section is an outline of the steps need to add a tool that takes a collection of objects (geometric and measurement) and produces the parameters to locate and size a non-custom existing <span class="class">Nodule</span> object (i.e. <span class="class">Point</span>,<span class="class">Segment</span>,<span class="class">Line</span>, <span class="class">Circle</span>, <span class="class">Ellipse</span>) based on the selection collection of objects. This will involve creating a new <span class="class">SENodule</span> object and a new eventHandler to construct the <span class="class">SENodule</span> object and associated it to an exist <span class="class">Nodule</span> object. In all cases attempt to following the naming conventions outlined by the other variables and files.

1. Create a new entry in the <span class="variable">buttonList</span> found in the <span class="file">ToolGroups.vue</span> file. Decide on
   - <span class="variable">id</span>: This is the <span class="variable">toolGroup</span> followed by a dash and a number that controls the order that the tools in this group are listed.
   - <span class="variable">actionModeValue</span>: This is a unique string (the actionMode) that is used to activate the correct event handler when this button is pressed.
   - <span class="variable">icon</span>: Create an icon or select a name from the [Material Design Icons](https://cdn.materialdesignicons.com/5.0.45/).
   - Use the language feature to set up the following messages. Each of the variables below is a string pointer to an object in a file in the <span class="directory">languages</span> directory. English speakers will probably add to the <span class="file">en.json</span> file.
     - <span class="variable">displayedName</span> A short name for the tool displayed in footer.
     - <span class="variable">toolTipMessage</span> A short message to describe the tools use when the button is moused over.
     - <span class="variable">toolUseMessage</span> A longer message to describe more fully the use of the tool.
   - <span class="variable">displayToolUseMessage</span>: A flag to control the display of the tool use message.
   - <span class="variable">toolGroup</span>: This is the group that the tool will appear in. Picking an existing group is the easiest way to get the tool displayed. If a new tool group is created, this section of code in <span class="variable">ToolGroups.vue</span> will have to be duplicated:
   ```vue
   <!--
      The XXXXXX Tool Group only shown if the user has permission to use a tool in this
      group. Note the use of the translation $t(key_value).
    -->
   <div id="XXXXXXXToolGroup" v-show="nonEmptyGroup('XXXXXX')">
      <h3 class="body-1 font-weight-bold">{{ $t("toolGroups.XXXXXXTools") }}</h3>
      <v-btn-toggle
        v-model="actionMode"
        @change="switchActionMode"
        class="mr-2 d-flex flex-wrap accent"
      >
        <ToolButton
          v-for="(button, pos) in buttonList"
          :key="pos"
          :button="button"
          toolGroup="XXXXXX"
          v-on:displayOnlyThisToolUseMessage="displayOnlyThisToolUseMessageFunc"
        ></ToolButton>
      </v-btn-toggle>
    </div>
   ```
2. Add the new tool name to the list of tools to be displayed in ???????. Add the <span class="variable">actionMode</span> string to the list.
3. Write a new <span class="class">SENodule</span> file. These files always start with the letters SE. See the [Models Directory](/design/#models-directory).

   - Copy the form of the <span class="method">update(state: SaveStateType)</span> method. In particular this should start with

     ```ts
     if (!this.canUpdateNow()) {
       return;
     }
     this.setOutOfDate(false);
     ```

     Then it should update the existence and location of the object and should end with setting the display of the corresponding <span class="class">Nodule</span> object. (Make sure that you set the parameters to properly display the <span class="class">Nodule</span> object -- read the variables section of the object for directions.)
     The last lines should be

     ```ts
     switch (state.mode) {
       case SaveStateMode.UndoMove: {
         // Store any information about the SENodule that is *not* determined by its point parents.  (Any
         // information that is not captured by the locations of the point parent(s) and will not correctly be
         // recreated on an update({}) method must be store here). A new XXXSaveState will have to be
         // created in @/types/index.ts
         break;
       }
       case SaveStateMode.UndoDelete: {
          // Store all information about this SENodule here
         break;
       }
       // The DisplayOnly case fall through and does nothing
       case SaveStateMode.DisplayOnly:
       default:
         break;
     }
     this.updateKids(state:);
     ```

     See more in the [Move Handler](/design/#move-handler) and [Delete Handler](/design/#delete-handler).

4. Write an [event handler](/design/#event-handlers). Start by thinking about which tool is most similar to the one being created. Start by creating a copy of that file and renaming it appropriately. Copy the structure to properly link the <span class="class">Nodule</span> and <span class="class">SENodule</span> objects. See the [Plottables Directory](/design/#plottables-directory).
   - A new <span class="command">Command</span> object will have to written. Look and see which existing commands are most similar to the one being created. Copy that command. See the [Command](/design/#commands) section. This class is where all newly created objects are inserted (and removed on <span class="method">restoreState()</span>) into the [Data Structure](/design/#data-structure). Think carefully about undoing. Adding a new kind of point requires that when you undo and then redo the add operation it remains the new kid of object.
   - A new mutations of the store may be required. Look in the <span class="file">mutations.ts</span> in the [Store](/design/#store). Although the <span class="string">RemovePoint</span> mutation might work.
   - Edge case questions to ask: What should the behavior be if...
     - The user mouse presses outside of the canvas, and mouse releases in the canvas (inside of the sphere or not)?
     - The user mouse presses inside the canvas, mouse moves outside of the sphere (with out a mouse leave event, so still in the canvas), and then mouse releases inside of the canvas (inside of the sphere or not)?
     - The user mouse presses inside the canvas, mouse moves outside of the sphere (_with_ a mouse leave event), and then mouse releases... inside of the canvas or not... inside of the sphere or not?
     - The user presses and release in the same location.
5. Add the tool to the <span class="file">SphereFrame.vue</span> file.
   - Import the handler.
   - Add a private variable (like <span class="variable">xxxxTool</span> ) for the handler.
   - In the <span class="method">mounted()</span> method add the constructor call.
   - In the <span class="method">switchActionMode(mode: string)</span> add a new case using the <span class="variable">actionMode</span> string and tool reference
6. Debug your tool. Play with it and make sure it behaves in many situations.
   - What is the behavior under all the edge condition list in step 4? How does undo and redo work in each of those edge cases?
7. Add at least three new tests in the <span class="file">???</span> file in the <span class="directory">test</span> directory.
8. Update the documentation. Create a new description of the use of the tool in the
   - [Tools Documents](/tools/edit.html)
   - [Event Handlers](/design/#event-handlers)

## Adding a New Object Tool

This section is an outline of the steps needed to add a tool that takes user mouse information and creates a new one-dimensional object based on the user information. This is a much more involved task and requires an intimate knowledge of how Sphere Easel work. This will involving creating both a new <span class="class">SENodule</span> object and a corresponding <span class="class">Nodule</span> object. It will involve modifying many of the existing class to take into account this new object.