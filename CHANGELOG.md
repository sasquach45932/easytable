## 1.4.0 - Compat (2025/06/13)
* Foundry V13 support

## 1.3.2 - Compat (2021/05/22)
* Updated version compat to 0.8.5

## 1.3.1 - Export (2021/02/28)

* Added table export to CSV
  * Right click on any table in the Rolltable directory and select EasyTable Export
  * Set your separator character, and choose whether to ignore weights and/or entity types

## 1.3.0 - Revival (2021/02/25)

* Added Entity types
  * Default entity selected via dropdown
  * Per-entry entity marked in weight brackets (`ItemName{@Item}`, `ItemName{2@Item}`)
* Added PDF-style input support, based on JackDCondon PR
  * Added SafeMode toggle to bypass this code in case of errors
* Added 0.8.0 support
  * Rolltable creation has changed slightly. New code should be a little more robust
* Added BugReporter support
* Added EasyTable default image

## 1.2.6 - Minor tweaks (2021/02/24)

* Removed TablePaste Mode
  * Now uses two different buttons to select mode for simplicity
* Added translation support
* Set tablepaste dialog resizable
* Added manifest+ metadata

## 1.2.5 - Fixed 0.7x compat (2020/11/09)

* Game settings set correctly

## 1.2.3 - Tweaked hooks to prevent errors (2020/07/27)

* Cleaned up hooks to stop clients from erroring. Not a fatal issue.

## 1.2.1 - Improved parsing (2020/06/29)

* Improved the parsing for 'Paste from table mode' data. Now supports line-break based tables.
  * Also improved whitespace faults, trimming & detecting empty rows

eg.

> 01–02
> 
> Roll on this table at the start of each of your turns for the next minute, ignoring this result on subsequent rolls.
> 
> 03–04
> 
> For the next minute, you can see any invisible creature if you have line of sight to it.
> 
> 05–06
> 
> A modron chosen and controlled by the DM appears in an unoccupied space within 5 feet of you, then disappears 1 minute later.


## 1.2.0 - Added new input mode (2020/06/28)

* Change input mode in module settings
* New input mode should allow you to directly copy entries from tables found online following the format `[number|number-range][whitespace]Entry Text Here[newline]`

eg.
1    Entry number one
2-3    Entry number two
4    Entry number 3

The whitespace can be either a single space, or a single tab.

## 1.1.0 - Added table weights (2020/06/28)

* Entries can now be 'weighted' with {} - e.g Entry1,Entry2{2},Entry3 will create a 1d4 table where Entry2 is selected on a roll of 2 or 3

## 1.0.0 - Initial public release (2020/06/17)

* Added the ability to change the separator character.
* Updated settings commits to remember the previously used separator
* Squashed some bugs
