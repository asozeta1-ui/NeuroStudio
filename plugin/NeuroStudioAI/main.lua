--!nonstrict

print("[NeuroStudio AI] v4: cargando")

local HttpService = game:GetService("HttpService")
local Selection = game:GetService("Selection")

local SERVER_URL = "http://127.0.0.1:3000"
local POLL_RATE = 3

local toolbar = plugin:CreateToolbar("NeuroStudio AI")
local button = toolbar:CreateButton("NeuroStudio", "⚡", "AI coding agent for Roblox Studio")

local okWidget, widget = pcall(function()
	return plugin:CreateDockWidgetPluginGui(
		"NeuroStudioAIGui",
		DockWidgetPluginGuiInfo.new(
			Enum.InitialDockState.Float,
			true,
			true,
			420, 560,
			380, 300,
			800, 1200
		)
	)
end)

if not okWidget or not widget then
	local err = tostring(widget)
	print("[NeuroStudio AI] ERROR creando widget: " .. err)
	error("[NeuroStudio AI] no se pudo crear el widget: " .. err)
end
widget.Title = "⚡ NeuroStudio AI"
widget.Name = "NeuroStudioAIGui"

local function new(className, props, parent)
	local inst = Instance.new(className)
	for k, v in pairs(props) do inst[k] = v end
	if parent then inst.Parent = parent end
	return inst
end

local BG = Color3.fromRGB(15, 15, 19)
local CARD = Color3.fromRGB(23, 23, 29)
local ACCENT = Color3.fromRGB(139, 92, 246)
local TEXT = Color3.fromRGB(244, 244, 245)
local MUTED = Color3.fromRGB(157, 157, 168)
local GREEN = Color3.fromRGB(134, 239, 172)

local root = new("Frame", { BackgroundColor3 = BG, Size = UDim2.fromScale(1, 1) }, widget)
new("UIPadding", {
	PaddingTop = UDim.new(0, 12), PaddingBottom = UDim.new(0, 12),
	PaddingLeft = UDim.new(0, 12), PaddingRight = UDim.new(0, 12),
}, root)
new("UIListLayout", { Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, root)

local header = new("Frame", { LayoutOrder = 0, BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 26) }, root)
new("TextLabel", {
	BackgroundTransparency = 1, Size = UDim2.fromOffset(180, 26),
	Font = Enum.Font.GothamBold, TextSize = 15, TextXAlignment = Enum.TextXAlignment.Left,
	TextColor3 = TEXT, Text = "⚡ NeuroStudio Chat",
}, header)
local statusDot = new("Frame", {
	BackgroundColor3 = Color3.fromRGB(107, 107, 118), Size = UDim2.fromOffset(8, 8),
	AnchorPoint = Vector2.new(1, 0.5), Position = UDim2.new(1, 0, 0.5, 0), Name = "Dot",
}, header)
new("UICorner", { CornerRadius = UDim.new(1, 0) }, statusDot)
local statusLabel = new("TextLabel", {
	BackgroundTransparency = 1, Size = UDim2.fromOffset(120, 26),
	AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -14, 0, 0),
	Font = Enum.Font.Gotham, TextSize = 11, TextXAlignment = Enum.TextXAlignment.Right,
	TextColor3 = MUTED, Text = "conectando…",
}, header)

local scroller = new("ScrollingFrame", {
	LayoutOrder = 1, BackgroundColor3 = CARD, Size = UDim2.new(1, 0, 1, -228),
	CanvasSize = UDim2.new(0, 0, 0, 0), AutomaticCanvasSize = Enum.AutomaticSize.Y,
	ScrollBarThickness = 4, BorderSizePixel = 0,
}, root)
new("UICorner", { CornerRadius = UDim.new(0, 10) }, scroller)
new("UIListLayout", { Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, scroller)
new("UIPadding", { PaddingTop = UDim.new(0, 10), PaddingBottom = UDim.new(0, 10), PaddingLeft = UDim.new(0, 10), PaddingRight = UDim.new(0, 10) }, scroller)

local configRow = new("Frame", { LayoutOrder = 2, BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 78) }, root)
new("UIListLayout", { Padding = UDim.new(0, 6) }, configRow)

local providerRow = new("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 25) }, configRow)
new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 6) }, providerRow)
new("TextLabel", {
	BackgroundTransparency = 1, Size = UDim2.fromOffset(66, 25),
	Font = Enum.Font.Gotham, TextSize = 11, TextXAlignment = Enum.TextXAlignment.Left,
	TextColor3 = MUTED, Text = "Provider",
}, providerRow)
local providerBox = new("TextBox", {
	BackgroundColor3 = BG, Size = UDim2.new(1, -72, 1, 0), Text = "openrouter",
	ClearTextOnFocus = false, Font = Enum.Font.Gotham, TextSize = 11,
	TextColor3 = Color3.fromRGB(196, 181, 253), TextXAlignment = Enum.TextXAlignment.Left,
}, providerRow)
new("UICorner", { CornerRadius = UDim.new(0, 6) }, providerBox)
new("UIPadding", { PaddingLeft = UDim.new(0, 8) }, providerBox)

local keyRow = new("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 25) }, configRow)
new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 6) }, keyRow)
new("TextLabel", {
	BackgroundTransparency = 1, Size = UDim2.fromOffset(66, 25),
	Font = Enum.Font.Gotham, TextSize = 11, TextXAlignment = Enum.TextXAlignment.Left,
	TextColor3 = MUTED, Text = "API key",
}, keyRow)
local keyBox = new("TextBox", {
	BackgroundColor3 = BG, Size = UDim2.new(1, -72, 1, 0), Text = "",
	PlaceholderText = "opcional — usa la de la web", ClearTextOnFocus = false,
	Font = Enum.Font.Gotham, TextSize = 11, TextColor3 = TEXT, TextXAlignment = Enum.TextXAlignment.Left,
}, keyRow)
new("UICorner", { CornerRadius = UDim.new(0, 6) }, keyBox)
new("UIPadding", { PaddingLeft = UDim.new(0, 8) }, keyRow)

local syncInfo = new("TextLabel", {
	BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 16),
	Font = Enum.Font.Gotham, TextSize = 10, TextXAlignment = Enum.TextXAlignment.Left,
	TextColor3 = MUTED, Text = "🌐 sincronizando con la web…",
}, configRow)

local inputRow = new("Frame", { LayoutOrder = 3, BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 76) }, root)
new("UIListLayout", { Padding = UDim.new(0, 6) }, inputRow)
local chatInput = new("TextBox", {
	BackgroundColor3 = CARD, Size = UDim2.new(1, 0, 0, 44), Text = "",
	PlaceholderText = "Pregunta o pide construir algo…", ClearTextOnFocus = false,
	Font = Enum.Font.Gotham, TextSize = 12, TextColor3 = TEXT,
	PlaceholderColor3 = Color3.fromRGB(107, 107, 118),
	TextXAlignment = Enum.TextXAlignment.Left, TextWrapped = true,
}, inputRow)
new("UICorner", { CornerRadius = UDim.new(0, 8) }, chatInput)
new("UIPadding", { PaddingLeft = UDim.new(0, 10), PaddingRight = UDim.new(0, 10), PaddingTop = UDim.new(0, 6) }, chatInput)

local sendBtn = new("TextButton", {
	BackgroundColor3 = ACCENT, Size = UDim2.new(1, 0, 0, 26), Text = "Enviar ➤",
	Font = Enum.Font.GothamBold, TextSize = 12, TextColor3 = Color3.fromRGB(255, 255, 255),
}, inputRow)
new("UICorner", { CornerRadius = UDim.new(0, 8) }, sendBtn)

local renderedIds = {}
local layoutCounter = 0

local function addMessage(msg)
	if renderedIds[msg.id] then return end
	renderedIds[msg.id] = true
	layoutCounter = layoutCounter + 1

	local isUser = msg.role == "user"
	local isStudio = msg.role == "studio"

	local frame = new("Frame", {
		LayoutOrder = layoutCounter, BackgroundTransparency = 1,
		Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y,
	}, scroller)
	new("UIListLayout", { Padding = UDim.new(0, 4), SortOrder = Enum.SortOrder.LayoutOrder }, frame)

	local label = new("TextLabel", {
		BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y, TextWrapped = true,
		Font = Enum.Font.Gotham, TextSize = 12, LayoutOrder = 0,
		TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top,
	}, frame)

	if isUser then
		label.TextColor3 = Color3.fromRGB(196, 181, 253)
		label.Text = "🧑 " .. tostring(msg.text)
	elseif isStudio then
		label.TextColor3 = GREEN
		label.Text = "🎮 " .. tostring(msg.text)
	else
		label.TextColor3 = TEXT
		label.Text = "⚡ " .. tostring(msg.text)
	end

	if msg.actions and #msg.actions > 0 then
		new("TextLabel", {
			BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 0),
			AutomaticSize = Enum.AutomaticSize.Y, TextWrapped = true,
			Font = Enum.Font.Gotham, TextSize = 10, TextXAlignment = Enum.TextXAlignment.Left,
			TextColor3 = MUTED, Text = "⚡ " .. #msg.actions .. " acción(es) del agente", LayoutOrder = 1,
		}, frame)
	end

	task.defer(function()
		scroller.CanvasPosition = Vector2.new(0, math.huge)
	end)
end

local function getInstancePath(inst)
	local parts = {}
	local current = inst
	while current and current ~= game do
		table.insert(parts, 1, current.Name)
		current = current.Parent
	end
	return table.concat(parts, "/")
end

local function getContext()
	local selected = {}
	for _, inst in ipairs(Selection:Get()) do
		if #selected < 10 then
			table.insert(selected, getInstancePath(inst))
		end
	end
	return { place = tostring(game.Name), selected = selected }
end

local function resolvePath(path)
	if not path or #path == 0 then return nil end
	local current = game
	for part in string.gmatch(path, "[^/]+") do
		current = current:FindFirstChild(part)
		if not current then return nil end
	end
	return current
end

local function setProp(inst, key, value)
	local current
	local okRead = pcall(function() current = inst[key] end)
	if not okRead then return false end

	local ok = pcall(function()
		if typeof(value) == "table" then
			local t = typeof(current)
			if t == "Vector3" then
				inst[key] = Vector3.new(tonumber(value[1]) or 0, tonumber(value[2]) or 0, tonumber(value[3]) or 0)
			elseif t == "Color3" then
				inst[key] = Color3.fromRGB(tonumber(value[1]) or 255, tonumber(value[2]) or 255, tonumber(value[3]) or 255)
			elseif t == "Vector2" then
				inst[key] = Vector2.new(tonumber(value[1]) or 0, tonumber(value[2]) or 0)
			elseif t == "UDim2" then
				inst[key] = UDim2.new(tonumber(value[1]) or 0, tonumber(value[2]) or 0, tonumber(value[3]) or 0, tonumber(value[4]) or 0)
			elseif t == "CFrame" then
				inst[key] = CFrame.new(tonumber(value[1]) or 0, tonumber(value[2]) or 0, tonumber(value[3]) or 0)
			else
				error("array no soportado para '" .. tostring(key) .. "'")
			end
		elseif typeof(value) == "string" and typeof(current) == "EnumItem" then
			local found = nil
			for _, item in ipairs(current.EnumType:GetEnumItems()) do
				if item.Name == value then found = item; break; end
			end
			if not found then error("enum no encontrado: " .. tostring(value)) end
			inst[key] = found
		else
			inst[key] = value
		end
	end)
	return ok
end

local function executeAction(action)
	local params = action.params or action
	local actionType = action.action or params.action

	if actionType == "insert_script" then
		local parent = resolvePath(params.parent or "ServerScriptService") or game:GetService("ServerScriptService")
		local existing = parent:FindFirstChild(params.name or "NeuroGenerated")
		if existing then existing:Destroy() end
		local scriptType = params.scriptType == "LocalScript" and "LocalScript"
			or (params.scriptType == "ModuleScript" and "ModuleScript" or "Script")
		local s = Instance.new(scriptType)
		s.Name = params.name or "NeuroGenerated"
		local ok, err = pcall(function() s.Source = params.source or "" end)
		if not ok then return false, "no se pudo escribir Source: " .. tostring(err) end
		s.Parent = parent
		Selection:Set({ s })
		return true, nil

	elseif actionType == "create_instance" then
		local parent = resolvePath(params.parent or "Workspace") or game:GetService("Workspace")
		local okNew, inst = pcall(function() return Instance.new(params.className or "Part") end)
		if not okNew or not inst then
			return false, "className inválido: " .. tostring(params.className)
		end
		if params.name then inst.Name = params.name end
		for k, v in pairs(params.properties or {}) do
			if not setProp(inst, k, v) then
				inst:Destroy()
				return false, "propiedad inválida '" .. tostring(k) .. "' en " .. tostring(params.className)
			end
		end
		inst.Parent = parent
		Selection:Set({ inst })
		return true, inst.ClassName .. " '" .. inst.Name .. "' creado en " .. getInstancePath(parent)

	elseif actionType == "set_property" then
		local inst = resolvePath(params.path)
		if not inst then return false, "no encontrado: " .. tostring(params.path) end
		for k, v in pairs(params.properties or {}) do
			if not setProp(inst, k, v) then
				return false, "propiedad inválida '" .. tostring(k) .. "' en " .. tostring(params.path)
			end
		end
		return true, "propiedades actualizadas en " .. tostring(params.path)

	elseif actionType == "duplicate_instance" then
		local inst = resolvePath(params.path)
		if not inst then return false, "no encontrado: " .. tostring(params.path) end
		local parent = resolvePath(params.parent or "") or inst.Parent
		local clone = inst:Clone()
		if params.name then clone.Name = params.name end
		clone.Parent = parent
		Selection:Set({ clone })
		return true, clone.ClassName .. " '" .. clone.Name .. "' duplicado en " .. getInstancePath(parent)

	elseif actionType == "set_source" then
		local inst = resolvePath(params.path)
		if not inst then return false, "no encontrado: " .. tostring(params.path) end
		if not inst:IsA("BaseScript") and not inst:IsA("ModuleScript") then
			return false, params.path .. " no es un script"
		end
		local ok, err = pcall(function() inst.Source = params.source or "" end)
		if not ok then return false, tostring(err) end
		return true, nil

	elseif actionType == "get_source" then
		local inst = resolvePath(params.path)
		if not inst then return false, "no encontrado: " .. tostring(params.path) end
		if not inst:IsA("BaseScript") and not inst:IsA("ModuleScript") then
			return false, params.path .. " no es un script"
		end
		return true, inst.Source

	elseif actionType == "inspect" then
		local inst = resolvePath(params.path or "Workspace")
		if not inst then return false, "no encontrado: " .. tostring(params.path) end
		local lines = { inst.ClassName .. " '" .. inst.Name .. "' hijos:" }
		local children = inst:GetChildren()
		for i = 1, math.min(#children, 25) do
			local c = children[i]
			local extra = c:IsA("BaseScript") and " (script)" or ""
			table.insert(lines, "  - " .. c.ClassName .. " '" .. c.Name .. "'" .. extra)
		end
		if #children > 25 then table.insert(lines, "  … y " .. (#children - 25) .. " más") end
		return true, table.concat(lines, "\n")

	elseif actionType == "delete_instance" then
		local inst = resolvePath(params.path)
		if not inst then return false, "no encontrado: " .. tostring(params.path) end
		inst:Destroy()
		return true, nil

	elseif actionType == "create_folder" then
		local parent = resolvePath(params.parent or "ReplicatedStorage") or game:GetService("ReplicatedStorage")
		local f = Instance.new("Folder")
		f.Name = params.name or "NewFolder"
		f.Parent = parent
		Selection:Set({ f })
		return true, nil

	elseif actionType == "select" then
		local inst = resolvePath(params.path)
		if not inst then return false, "no encontrado: " .. tostring(params.path) end
		Selection:Set({ inst })
		return true, nil
	end

	return false, "acción desconocida: " .. tostring(actionType)
end

local function postResult(actionId, ok, resultText, err)
	local payload = HttpService:JSONEncode({ actionId = actionId, ok = ok, error = err, resultText = resultText })
	pcall(function()
		HttpService:PostAsync(SERVER_URL .. "/api/plugin/result", payload, Enum.HttpContentType.ApplicationJson)
	end)
end

local vaultHasKey = false
local providerDirty = false
local autoFilling = false

local syncing = false
local httpErrorShown = false

local function reportHttpError(where, err)
	if not httpErrorShown then
		httpErrorShown = true
		print("[NeuroStudio AI] HTTP " .. where .. ": " .. tostring(err))
		print("[NeuroStudio AI] ¿Servidor corriendo? -> node server.js en la carpeta del proyecto")
	end
end

local function sync()
	if syncing then return end
	syncing = true
	local payload = HttpService:JSONEncode({ context = getContext() })
	local ok, result = pcall(function()
		return HttpService:PostAsync(SERVER_URL .. "/api/plugin/sync", payload, Enum.HttpContentType.ApplicationJson)
	end)

	if not ok then
		statusDot.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
		statusLabel.Text = "servidor offline"
		reportHttpError("sync", result)
		syncing = false
		return
	end
	httpErrorShown = false

	statusDot.BackgroundColor3 = GREEN
	statusLabel.Text = "sincronizado ✓"

	local ok2, data = pcall(function() return HttpService:JSONDecode(result) end)
	if not ok2 then syncing = false; return end

	if data.keyStatus then
		vaultHasKey = data.keyStatus.hasKey == true
		local vp = data.keyStatus.provider
		if vp and #vp > 0 and not providerDirty then
			autoFilling = true
			providerBox.Text = vp
			autoFilling = false
		end
		if vaultHasKey then
			syncInfo.Text = "🌐 key de la web activa (" .. tostring(vp) .. ")"
			syncInfo.TextColor3 = GREEN
		else
			syncInfo.Text = "🌐 sin key en la web — configúrala en localhost:3000"
			syncInfo.TextColor3 = MUTED
		end
	end

	for _, msg in ipairs(data.messages or {}) do
		addMessage(msg)
	end

	for _, action in ipairs(data.pendingActions or {}) do
		local aok, resultText = executeAction(action)
		if aok then
			postResult(action.id, true, resultText, nil)
		else
			postResult(action.id, false, nil, resultText)
		end
	end

	syncing = false
end

local isSending = false

local function doSend()
	if isSending then return end
	local text = chatInput.Text
	if #text == 0 then return end
	local apiKey = keyBox.Text
	local providerId = providerBox.Text
	if #apiKey == 0 and not vaultHasKey then
		sendBtn.Text = "⚠️ falta API key"
		task.delay(3, function() sendBtn.Text = "Enviar ➤" end)
		return
	end
	isSending = true
	chatInput.Text = ""
	sendBtn.Text = "Pensando…"
	sendBtn.BackgroundColor3 = Color3.fromRGB(99, 102, 241)
	local elapsed = 0
	local timerTask = task.spawn(function()
		while true do
			task.wait(1)
			elapsed = elapsed + 1
			sendBtn.Text = "Pensando… " .. elapsed .. "s"
		end
	end)

	local payload = HttpService:JSONEncode({
		text = text, providerId = providerId,
		apiKey = #apiKey > 0 and apiKey or nil,
		model = nil,
	})
	local ok, result = pcall(function()
		return HttpService:PostAsync(SERVER_URL .. "/api/chat/send", payload, Enum.HttpContentType.ApplicationJson, false, 180)
	end)
	task.cancel(timerTask)
	isSending = false
	sendBtn.Text = "Enviar ➤"
	sendBtn.BackgroundColor3 = ACCENT
	if not ok then
		statusLabel.Text = "error al enviar (¿servidor?)"
	else
		local ok2, data = pcall(function() return HttpService:JSONDecode(result) end)
		if ok2 and data and data.ok == false then
			statusLabel.Text = "⚠️ " .. tostring(data.error):sub(1, 60)
		else
			task.spawn(sync)
		end
	end
end

sendBtn.MouseButton1Click:Connect(doSend)
chatInput.FocusLost:Connect(function(enterPressed)
	if enterPressed then doSend() end
end)

keyBox.Text = plugin:GetSetting("NSAI_ApiKey") or ""
providerBox.Text = plugin:GetSetting("NSAI_Provider") or "openrouter"
keyBox:GetPropertyChangedSignal("Text"):Connect(function() plugin:SetSetting("NSAI_ApiKey", keyBox.Text) end)
providerBox:GetPropertyChangedSignal("Text"):Connect(function()
	if autoFilling then return end
	providerDirty = true
	plugin:SetSetting("NSAI_Provider", providerBox.Text)
end)

button.Click:Connect(function()
	widget.Enabled = not widget.Enabled
end)
widget:BindToClose(function() widget.Enabled = false end)

task.spawn(function()
	print("[NeuroStudio AI] v4: listo (" .. SERVER_URL .. ")")
	while true do
		sync()
		task.wait(POLL_RATE)
	end
end)
