
Canvas
------

These are texture images for the canvas, 10540x2250 pixels in size.

## Fade two images

Create a YAML file in the same directory where the images reside.
This is how the file should look:

    id:        UniqueId
    name:      DescriptiveName
    texture1:  filenameOfTheFirstImage.png
    texture2:  filenameOfTheSecondImage.png
    fadeTrans: 1500
    fadeWait:  10000
    exclusive: true

- fadeTrans: the time im ms for the change of the two images
- fadeWait: the time in ms between changes
- exclusive: the hint that this canvas is reserved for exclusive use by a certain type of event

In the Studio-Canvas UI the setup will be seen as a singe entry with the
*DescriptiveName* you used in the YAML file. Please always place images
and YAML files in a directory of its own (usually the event) and do not
clutter the top-level directory here.

