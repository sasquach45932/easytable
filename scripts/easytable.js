Hooks.on("renderRollTableDirectory", app => {
	const html = $(app.element)
	if (!game.user.isGM) {
		return
	}
	if (app.options.id == "tables") {
		// -- Values Mode --
		let csvButton = $(`<button class='new-easytable'><i class='fas fa-file-csv'></i> ${game.i18n.localize("EASYTABLE.ui.button-csv-title")}</button>`)
		let settings = game.settings.get("EasyTable", "tableSettings")
		csvButton.click(async function () {
			let result = await foundry.applications.api.DialogV2.input({
				window: {
					title: game.i18n.localize("EASYTABLE.ui.dialog.csv.title")
				},
				content: EasyTable.prepareContent("values"),
				ok: {
					label: game.i18n.localize("EASYTABLE.ui.dialog.csv.button.generate")
				},
				buttons: [
					{
						label: game.i18n.localize("EASYTABLE.ui.dialog.csv.button.cancel"),
						default: true
					}
				]
			})

			if (result !== null && result !== undefined) {
				let title = result.title === "" ? "EasyTable" : result.title
				let description = result.description === "" ? "An easy table" : result.description
				let csvData = result.csvData
				let separator = result.separator === "" ? "," : result.separator
				let defaultCollection = result.defaultCollection

				let lines = csvData
				lines = lines.replaceAll(/\r?\n|\r/g, "").replaceAll(/\s/g, "")

				if (lines.length !== 0) {
					await EasyTable.generateTable(title, description, csvData, separator, defaultCollection)
					ui.notifications.notify(`${game.i18n.localize("EASYTABLE.notif.table-created")} ${title}`)
				} else {
					ui.notifications.error(game.i18n.localize("EASYTABLE.notif.csv-required"))
				}
			}
		})

		// -- Table Paste mode --
		let tableButton = $(`<button class='new-easytable'><i class='fas fa-file-csv'></i> ${game.i18n.localize("EASYTABLE.ui.button-tablepaste-title")}</button>`)
		tableButton.click(async function () {
			let result = await foundry.applications.api.DialogV2.input({
				window: {
					title: game.i18n.localize("EASYTABLE.ui.dialog.tablepaste.title")
				},
				content: EasyTable.prepareContent("paste"),
				ok: {
					label: game.i18n.localize("EASYTABLE.ui.dialog.csv.button.generate")
				},
				buttons: [
					{
						label: game.i18n.localize("EASYTABLE.ui.dialog.csv.button.cancel"),
						default: true
					}
				]
			})

			if (result !== null && result !== undefined) {
				let title = result.title === "" ? "EasyTable" : result.title
				let description = result.description === "" ? "An easy table" : result.description
				let tableData = result.tableData
				let safeMode = result.safeMode

				let lines = tableData
				lines = lines.replaceAll(/\r?\n|\r/g, "").replaceAll(/\s/g, "")

				if (lines.length !== 0) {
					await EasyTable.generateTablePastedData(title, description, tableData, safeMode)
					ui.notifications.notify(`${game.i18n.localize("EASYTABLE.notif.table-created")} ${title}`)
				} else {
					ui.notifications.error(game.i18n.localize("EASYTABLE.notif.tabledata-required"))
				}
			}
		})

		let header = `<span class="new-easytable">${game.i18n.localize("EASYTABLE.ui.button-header")}</span><div class="easytable-actions header-actions action-buttons flexrow">
    </div>`
		$(header).insertAfter(html.find(".directory-header").find(".header-actions"))
		$(".easytable-actions").append(csvButton).append(tableButton)
	}
})

Hooks.on("init", () => {
	let etSettings = {
		title: game.i18n.localize("EASYTABLE.settings.defaults.title"),
		description: game.i18n.localize("EASYTABLE.settings.defaults.description"),
		data: "val1,val2{2},val3",
		separator: ","
	}
	game.settings.register("EasyTable", "tableSettings", {
		name: "Easytable Default Settings",
		scope: "world",
		config: false,
		default: etSettings
	})

	const base = foundry.applications.sidebar.tabs.RollTableDirectory.prototype._getEntryContextOptions
	foundry.applications.sidebar.tabs.RollTableDirectory.prototype._getEntryContextOptions = function () {
		const entries = game.user.isGM ? base.call(this) : []
		entries.push({
			name: game.i18n.localize("EASYTABLE.ui.context.export"),
			icon: '<i class="fas fa-file-csv"></i>',
			condition: game.user.isGM,
			callback: EasyTable.exportTableToCSV
		})
		return entries
	}
})

class EasyTable {
	static getCollection(collection) {
		let validCollection = ["Actor", "Scene", "Macro", "Playlist", "JournalEntry", "RollTable", "Item"]
		if (validCollection.includes(collection)) {
			return collection
		}
		return ""
	}

	static prepareContent(mode) {
		let settings = game.settings.get("EasyTable", "tableSettings")
		let title = game.i18n.localize("EASYTABLE.ui.dialog.tablepaste.table-title")
		let description = game.i18n.localize("EASYTABLE.ui.dialog.tablepaste.table-description")
		let csvData = settings.data
		let separator = settings.separator

		const fields = foundry.applications.fields

		const textInputTname = fields.createTextInput({
			name: "title",
			placeholder: title
		})

		const textInputTdesc = fields.createTextInput({
			name: "description",
			placeholder: description
		})

		const textInputValue = fields.createTextareaInput({
			name: "csvData",
			value: csvData,
			rows: 10
		})

		const textInputSeparator = fields.createTextInput({
			name: "separator",
			placeholder: separator
		})

		const textGroupName = fields.createFormGroup({
			input: textInputTname,
			label: game.i18n.localize("EASYTABLE.ui.dialog.tablepaste.table-title")
		})

		const textInputtableData = fields.createTextareaInput({
			name: "tableData",
			rows: 10
		})

		const checkBox = fields.createCheckboxInput({
			name: "safeMode"
		})

		const checkBoxGroup = fields.createFormGroup({
			input: checkBox,
			label: game.i18n.localize("EASYTABLE.ui.dialog.tablepaste.safemode")
		})

		const textGroupDesc = fields.createFormGroup({
			input: textInputTdesc,
			label: game.i18n.localize("EASYTABLE.ui.dialog.tablepaste.table-description")
		})

		const textGroupSeparator = fields.createFormGroup({
			input: textInputSeparator,
			label: game.i18n.localize("EASYTABLE.ui.dialog.csv.separator")
		})

		const selectInput = fields.createSelectInput({
			options: [
				{
					label: "Text",
					value: "Text"
				},
				{
					label: "Item",
					value: "Item"
				},
				{
					label: "Actor",
					value: "Actor"
				},
				{
					label: "Scene",
					value: "Scene"
				},
				{
					label: "JournalEntry",
					value: "JournalEntry"
				},
				{
					label: "Macro",
					value: "Macro"
				},
				{
					label: "RollTable",
					value: "RollTable"
				},
				{
					label: "Playlist",
					value: "Playlist"
				}
			],
			name: "defaultCollection"
		})

		const selectGroup = fields.createFormGroup({
			input: selectInput,
			label: game.i18n.localize("EASYTABLE.ui.dialog.csv.defaultcollection"),
			hint: game.i18n.localize("EASYTABLE.ui.dialog.csv.defaultcollection-tooltip")
		})

		if (mode === "values") return `${textGroupName.outerHTML} ${textGroupDesc.outerHTML} ${textInputValue.outerHTML}  ${textGroupSeparator.outerHTML} ${selectGroup.outerHTML}`
		else return `${textGroupName.outerHTML} ${textGroupDesc.outerHTML} ${textInputtableData.outerHTML} ${checkBoxGroup.outerHTML}`
	}

	static getResultId(collection, text) {
		let resultId = ""
		let img = "icons/svg/d20-black.svg"
		if (collection == "Text" || !collection) {
			return [resultId, img]
		}
		let entity
		switch (collection) {
			case "Actor":
				entity = game.actors.getName(text)
				resultId = entity?.id || ""
				img = entity?.img || img
				break
			case "Scene":
				entity = game.scenes.getName(text)
				resultId = entity?.id || ""
				img = entity?.img || img
				break
			case "Macro":
				entity = game.macros.getName(text)
				resultId = entity?.id || ""
				img = entity?.data?.img || img
				break
			case "Playlist":
				entity = game.playlists.getName(text)
				resultId = entity?.id || ""
				// img = entity?.img||img;
				break
			case "JournalEntry":
				entity = game.journal.getName(text)
				resultId = entity?.id || ""
				img = entity?.data?.img || img
				break
			case "RollTable":
				entity = game.tables.getName(text)
				resultId = entity?.id || ""
				img = entity?.data?.img || img
				break
			case "Item":
				entity = game.items.getName(text)
				resultId = entity?.id || ""
				img = entity?.img || img
				break
			default:
				break
		}
		return [resultId, img]
	}

	static async generateTable(title, description, csvData, separator, defaultCollection = "Text") {
		let resultsArray = []
		let csvElements = csvData.split(separator)
		let rangeIndex = 1
		csvElements.forEach((csvElement, i) => {
			let [text, opts] = csvElement.split("{")
			let weight
			let collection = defaultCollection
			if (opts) {
				opts = opts.split("}")[0]
				;[weight, collection] = opts.split("@")
				weight = parseInt(weight)
			}
			if (!weight || weight < 1) {
				weight = 1
			}
			let type = 1
			let resultCollection = EasyTable.getCollection(collection)
			let [resultID, img] = EasyTable.getResultId(resultCollection, text)
			if (!resultID || resultID.length < 1) {
				resultCollection = ""
				type = 0
			}
			resultsArray.push({
				type: type,
				text: text,
				weight: weight,
				range: [rangeIndex, rangeIndex + (weight - 1)],
				collection: resultCollection,
				resultId: resultID,
				drawn: false,
				img: img
			})
			rangeIndex += weight
		})

		let table = await RollTable.create({
			name: title,
			description: description,
			results: resultsArray,
			replacement: true,
			displayRoll: true,
			img: "modules/easytable/assets/easytable.png"
		})
		await table.normalize()
	}

	static getDataRows(tableData) {
		return tableData.split(/\n(?=\d*[.\-–+\t]*)/g)
	}

	static deleteTrailingEmptyLine(tableEntries) {
		return tableEntries.filter(entry => !entry.match("^(\n|\r\n)$"))
	}

	static sanitize(tableData) {
		let rows = this.getDataRows(tableData)

		let resultData = ""

		rows.forEach(row => {
			row = row
				.replace(/[\n\r]+/g, " ")
				.replace(/\s{2,}/g, " ")
				.replace(/^\s+|\s+$/, "")
			resultData += row + "\n"
		})
		return resultData
	}

	static computeResults(data, safeMode) {
		let sanitizedData = data
		if (!safeMode) {
			sanitizedData = this.sanitize(data)
		}

		let resultsArray = []
		let processed = []
		let rawTableEntries = sanitizedData.split(/[\r\n]+/)
		let tableEntries = this.deleteTrailingEmptyLine(rawTableEntries)
		let rangeIndex = 1
		tableEntries.forEach((tableEntry, i) => {
			if (processed[i]) {
				return
			}
			processed[i] = true
			tableEntry = tableEntry.trim()
			if (tableEntry.length < 1) {
				return
			}
			let weight, text
			if (tableEntry.match(/^\d/)) {
				;[weight, text] = tableEntry.split(/(?<=^\S+)\s/)
				try {
					if (weight.match(/\d+[-|–]\d+/)) {
						let [beginRange, endRange] = weight.split(/[-–]/)
						if (endRange === "00") {
							endRange = "100"
						}
						weight = endRange - beginRange + 1
					} else {
						weight = 1
					}
					if (!text) {
						// Likely in a linebreak-based table
						while (!text && i < tableEntries.length - 1) {
							let index = ++i
							processed[index] = true
							text = tableEntries[index].trim()
						}
					}
				} catch (e) {
					console.log(e)
				}
			} else {
				text = tableEntry
			}
			if (!text) {
				text = "TEXT MISSING"
			}
			if (!weight || weight < 1) {
				weight = 1
			}
			weight = parseInt(weight)
			resultsArray.push({
				type: 0,
				text: text,
				weight: weight,
				range: [rangeIndex, rangeIndex + (weight - 1)],
				drawn: false
			})
			rangeIndex += weight
		})
		return resultsArray
	}

	static async generateTablePastedData(title, description, data, safeMode = false) {
		let resultsArray = this.computeResults(data, safeMode)

		let table = await RollTable.create({
			name: title,
			description: description,
			results: resultsArray,
			replacement: true,
			displayRoll: true,
			img: "modules/easytable/assets/easytable.png"
		})
		await table.normalize()
	}

	static async exportTableToCSV(li) {
		let settings = game.settings.get("EasyTable", "tableSettings")
		let separator = settings.separator

		const fields = foundry.applications.fields

		const checkBoxskipWeight = fields.createCheckboxInput({
			name: "skipWeight"
		})

		const checkBoxskipWeightGroup = fields.createFormGroup({
			input: checkBoxskipWeight,
			label: game.i18n.localize("EASYTABLE.ui.dialog.export.separator.skip-weight")
		})

		const checkBoxskipCollection = fields.createCheckboxInput({
			name: "skipCollection"
		})

		const CheckBoxskipCollectionGroup = fields.createFormGroup({
			input: checkBoxskipCollection,
			label: game.i18n.localize("EASYTABLE.ui.dialog.export.separator.skip-collection")
		})

		const textInputSeparator = fields.createTextInput({
			name: "separator",
			placeholder: separator
		})

		const textGroupSeparator = fields.createFormGroup({
			input: textInputSeparator,
			label: game.i18n.localize("EASYTABLE.ui.dialog.export.separator.prompt")
		})

		const content = `${textGroupSeparator.outerHTML} ${checkBoxskipWeightGroup.outerHTML} ${CheckBoxskipCollectionGroup.outerHTML}`

		let result = await foundry.applications.api.DialogV2.input({
			window: {
				title: game.i18n.localize("EASYTABLE.ui.dialog.export.separator.title")
			},
			content: content,
			ok: {
				label: game.i18n.localize("EASYTABLE.ui.dialog.export.separator.button-ok")
			}
		})

		if (result === null) retrun

		let skipWeight = result.skipWeight
		let skipCollection = result.skipCollection
		separator = result.separator === "" ? "," : result.separator

		let results = game.tables.get(li.dataset.entryId).results
		let output = ""
		let index = 0
		let separatorIssue = false
		for (let result of results) {
			let { weight, description, type, collection } = result
			// If an entry is empty, ensure it has a blank string, and remove the entity link
			if (!description) {
				description = ""
				type = 0
			}
			// Mark issues with chosen separator
			if (description.indexOf(separator) > -1) {
				separatorIssue = true
			}
			output += description

			// Handle skips
			if (skipWeight) {
				weight = 1
			}
			if (skipCollection) {
				type = 0
			}

			if (weight > 1) {
				output += `{${weight}${type == 1 && collection ? `@${collection}` : ""}}`
			} else if (type == 1 && collection) {
				output += `{@${collection}}`
			}
			if (++index <= results.size - 1) {
				output += separator
			}
		}

		const textInputtableData = fields.createTextareaInput({
			name: "tableData",
			rows: 10,
			value: output
		})

		result = await foundry.applications.api.DialogV2.input({
			title: game.i18n.localize("EASYTABLE.ui.dialog.export.output.title"),
			content: `${textInputtableData.outerHTML}`,
			ok: {
				label: game.i18n.localize("EASYTABLE.ui.dialog.export.output.button-copy")
			},
			buttons: [
				{
					label: game.i18n.localize("EASYTABLE.ui.dialog.export.output.button-close")
				}
			]
		})

		if (result !== undefined) {
			let textArea = textInputtableData
			textArea.value = result.tableData

			document.body.appendChild(textArea)
			textArea.focus()
			textArea.select()

			document.execCommand("copy")
			document.body.removeChild(textArea)
		}
	}
}