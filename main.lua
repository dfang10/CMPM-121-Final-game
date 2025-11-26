local g3d = require("g3d")
local bump = require("libs.bump")

local world
local player
local platform
local void
local block
local platformEnd
local win

local gameWon = false

-- Convert 2D physics coordinates to 3D
local function to3D(x, y)
	return x, -y, 0
end

function love.load()
	-- Setup
	love.graphics.setBackgroundColor(0.1, 0.1, 0.12)
	world = bump.newWorld(32)

	-- Create player
	player = {
		x = 100,
		y = 100,
		w = 30,
		h = 30,
		vx = 0,
		vy = 0,
		r = 15,
		angle = 0,
		grounded = false,
	}
	world:add(player, player.x, player.y, player.w, player.h)
	player.model = g3d.newModel("assets/sphere.obj", nil, { 0, 0, 0 }, nil, player.r)

	-- Create main platform
	platform = {
		x = 0,
		y = 200,
		w = 400,
		h = 32,
	}
	world:add(platform, platform.x, platform.y, platform.w, platform.h)
	platform.model = g3d.newModel("assets/cube.obj", nil, { 0, 0, 0 }, nil, 1)

	-- Create void platform
	void = {
		x = 350,
		y = 200,
		w = 200,
		h = 32,
		isVoid = true,
	}
	world:add(void, void.x, void.y, void.w, void.h)
	void.model = g3d.newModel("assets/cube.obj", nil, { 0, 0, 0 }, nil, 1)

	-- Create second platform
	platformEnd = {
		x = 550,
		y = 200,
		w = 200,
		h = 32,
	}
	world:add(platformEnd, platformEnd.x, platformEnd.y, platformEnd.w, platformEnd.h)
	platformEnd.model = g3d.newModel("assets/cube.obj", nil, { 0, 0, 0 }, nil, 1)

	-- Create pushable block
	block = {
		x = 150,
		y = 168,
		w = 60,
		h = 40,
		vx = 0,
		vy = 0,
	}
	world:add(block, block.x, block.y, block.w, block.h)
	block.model = g3d.newModel("assets/cube.obj", nil, { 0, 0, 0 }, nil, 1)

	-- Create win block
	win = {
		x = 600,
		y = 168,
		w = 32,
		h = 32,
		isWin = true,
	}
	world:add(win, win.x, win.y, win.w, win.h)
	win.model = g3d.newModel("assets/cube.obj", nil, { 0, 0, 0 }, nil, 1)
end

function love.update(dt)
	if gameWon then
		if love.keyboard.isDown("r") then
			restartGame()
		end
		return
	end

	-- Movement
	player.vx = 0
	if love.keyboard.isDown("left") then
		player.vx = -150
	end
	if love.keyboard.isDown("right") then
		player.vx = 150
	end

	-- Gravity
	player.vy = player.vy + 600 * dt

	-- Jump
	if (love.keyboard.isDown("up") or love.keyboard.isDown("space")) and player.grounded then
		player.vy = -300
		player.grounded = false
	end

	local nx = player.x + player.vx * dt
	local ny = player.y + player.vy * dt

	local actualX, actualY, cols, len = world:move(player, nx, ny)
	player.x, player.y = actualX, actualY

	player.grounded = false
	local pushingBlock = false

	for i = 1, len do
		local col = cols[i]

		-- Check if player touched the void platform
		if col.other.isVoid then
			player.x = 100
			player.y = platform.y - 50
			player.vx, player.vy = 0, 0
			player.angle = 0
			player.grounded = false
			world:update(player, player.x, player.y)
			break
		end

		-- Check if player touched the win block
		if col.other.isWin then
			gameWon = true
			break
		end

		-- Check collision
		if col.other == platform or col.other == block or col.other == platformEnd then
			if col.normal.y < 0 then
				player.grounded = true
				player.vy = 0
			end

			-- Check if player is pushing the block
			if col.other == block then
				if col.normal.x ~= 0 then
					pushingBlock = true
					block.vx = player.vx * 0.5
				end
			end
		end
	end

	-- Block physics
	if not pushingBlock then
		block.vx = block.vx * 0.9
	end

	-- Move block with collision detection
	local blockNX = block.x + block.vx * dt
	local blockNY = block.y + block.vy * dt

	local blockActualX, blockActualY, blockCols, blockLen = world:move(block, blockNX, blockNY)
	block.x, block.y = blockActualX, blockActualY

	-- Apply gravity to block
	block.vy = block.vy + 600 * dt

	-- Check if block is grounded on any platform
	local blockGrounded = false
	for i = 1, blockLen do
		local col = blockCols[i]
		if col.other == platform or col.other == platformEnd then
			if col.normal.y < 0 then
				blockGrounded = true
				block.vy = 0
			end
		end
	end

	-- === PLAYER MODEL ===
	local px = player.x + player.w/2
	local py = player.y + player.h/2
	player.model:setTranslation(px, -py, 0)
	player.angle = player.angle + (player.vx / player.r) * dt
	player.model:setAxisAngleRotation(0, 0, 1, player.angle)

	-- === MAIN PLATFORM ===
	local cx = platform.x + platform.w/2
	local cy = platform.y + platform.h/2
	platform.model:setTranslation(cx, -cy, 0)
	platform.model:setScale(platform.w, platform.h, 20)

	-- === VOID PLATFORM ===
	local vx = void.x + void.w/2
	local vy = void.y + void.h/2
	void.model:setTranslation(vx, -vy, 0)
	void.model:setScale(void.w, void.h, 20)

	-- === END PLATFORM ===
	local ex = platformEnd.x + platformEnd.w/2
	local ey = platformEnd.y + platformEnd.h/2
	platformEnd.model:setTranslation(ex, -ey, 0)
	platformEnd.model:setScale(platformEnd.w, platformEnd.h, 20)

	-- === BLOCK ===
	local bx = block.x + block.w/2
	local by = block.y + block.h/2
	block.model:setTranslation(bx, -by, 0)
	block.model:setScale(block.w, block.h, 20)

	-- === WIN BLOCK ===
	local wx = win.x + win.w/2
	local wy = win.y + win.h/2
	win.model:setTranslation(wx, -wy, 0)
	win.model:setScale(win.w, win.h, 20)


	-- Camera follow
	local px, py, pz = to3D(player.x + player.w/2, player.y + player.h/2)

	-- FIXED CAMERA POSITION
	local px = player.x + player.w/2
	local py = player.y + player.h/2

	local camX = px    -- left of player
	local camY = -py + 50   -- above player (flip y!)
	local camZ = 250         -- out of screen

	g3d.camera.position = { camX, camY, camZ }
	g3d.camera.target   = { px, -py, 0 }   -- IMPORTANT: camera looks at flipped y
	g3d.camera.up       = { 0, 1, 0 }



	local fallThreshold = platform.y + 200

	-- Check if player falls off
	if player.y > fallThreshold then
		player.x = 100
		player.y = platform.y - 50
		player.vx, player.vy = 0, 0
		player.angle = 0
		player.grounded = false
		world:update(player, player.x, player.y)
	end

	-- Check if block falls off
	if block.y > fallThreshold then
		block.x = 150
		block.y = platform.y - block.h
		block.vx, block.vy = 0, 0
		world:update(block, block.x, block.y)
	end
end

function love.draw()
	g3d.camera.updateViewMatrix()
	g3d.camera.updateProjectionMatrix()

	-- Draw main platform
	love.graphics.setColor(0.2, 0.8, 0.2)
	platform.model:draw()

	-- Draw void platform
	love.graphics.setColor(0.8, 0.2, 0.2)
	void.model:draw()

	-- Draw end platform
	love.graphics.setColor(0.2, 0.8, 0.2)
	platformEnd.model:draw()

	-- Draw block
	love.graphics.setColor(0.6, 0.4, 0.2)
	block.model:draw()

	if gameWon then
		local time = love.timer.getTime()
		local r = (math.sin(time * 2) + 1) / 2
		local g = (math.sin(time * 2 + 2) + 1) / 2
		local b = (math.sin(time * 2 + 4) + 1) / 2
		love.graphics.setColor(r, g, b)
	else
		love.graphics.setColor(1, 0.8, 0.2)
	end
	win.model:draw()

	-- Draw player
	love.graphics.setColor(0.8, 0.8, 0.2)
	player.model:draw()

	love.graphics.setColor(1, 1, 1)

	-- UI instructions
	love.graphics.print("Use arrow keys to move, space/up arrow to jump", 10, 10)
	love.graphics.print("Reach the gold box to win!", 10, 30)

	-- Win popup
	if gameWon then
		love.graphics.setColor(0, 0, 0, 0.7)
		love.graphics.rectangle("fill", 100, 150, 600, 200)

		-- Win message
		love.graphics.setColor(1, 1, 1)
		love.graphics.printf("VICTORY!", 100, 180, 600, "center")
		love.graphics.printf("You reached the goal!", 100, 220, 600, "center")
		love.graphics.printf("Press R to restart", 100, 260, 600, "center")
	end
end

function restartGame()
	gameWon = false

	-- Reset player
	player.x = 100
	player.y = platform.y - 50
	player.vx, player.vy = 0, 0
	player.angle = 0
	player.grounded = false
	world:update(player, player.x, player.y)

	-- Reset block
	block.x = 150
	block.y = platform.y - block.h
	block.vx, block.vy = 0, 0
	world:update(block, block.x, block.y)
end

function love.keypressed(key)
	if gameWon and key == "r" then
		restartGame()
	end
end
