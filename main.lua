
function love.load()
    resetGame()
end

function resetGame()
    truck = { x = 400, y = 500, speed = 200, hp = 5, attack = 1 , fireRate = 1, bulletSpeed = 300}
    bullets = {}
    enemies = {}
    enemyBullets = {}
    parts = {}
    selected = {}
    inventory = { items = {}}
    spawnTimer = 0
    gameOver = false
    killCount = 0
    shotTimer = 0
    abilityMessage = ""
    abilityMessageTimer = 0
end

function love.update(dt)
    if gameOver then
        if love.keyboard.isDown("r") then resetGame() end
        return
    end

    if abilityMessageTimer > 0 then
        abilityMessageTimer = abilityMessageTimer - dt
    end

    -- Movement
    if love.keyboard.isDown("w") then truck.y = truck.y - truck.speed * dt end
    if love.keyboard.isDown("s") then truck.y = truck.y + truck.speed * dt end
    if love.keyboard.isDown("a") then truck.x = truck.x - truck.speed * dt end
    if love.keyboard.isDown("d") then truck.x = truck.x + truck.speed * dt end

    local partDrops = {
    red = "attack_part",
    blue = "speed_part",
    green = "hp_part"
}

    -- Cooldown for shots
    shotTimer = math.max(0, shotTimer - dt)
    -- Shooting
    if love.keyboard.isDown("space") and shotTimer == 0 then
        table.insert(bullets, { x = truck.x, y = truck.y - 20, damage = truck.attack })
        shotTimer = truck.fireRate
    end

    -- Update player bullets and check collisions
    for i=#bullets,1,-1 do
        local b = bullets[i]
        b.y = b.y - truck.bulletSpeed * dt
        if b.y < 0 then
            table.remove(bullets, i)
        else
            for j=#enemies,1,-1 do
                local e = enemies[j]
                if math.abs(b.x - e.x) < e.size and math.abs(b.y - e.y) < e.size then
                    e.hp = e.hp - b.damage
                    if e.hp <= 0 then
                        applyUpgrade(e.type)
                        local dropType = partDrops[e.type]
                        spawnPart(e.x, e.y, dropType)
                        table.remove(enemies, j)
                        killCount = killCount + 1
                    end
                    table.remove(bullets, i)
                    break
                end
            end
        end
    end


    -- Spawn enemies
    spawnTimer = spawnTimer + dt
    if spawnTimer > 2 then
        local types = {"red", "blue", "green"}
        local enemyType = types[math.random(#types)]
        local enemyHp = (enemyType == "green") and 3 or 1
        table.insert(enemies, { x = math.random(50, 750), y = -20, type = enemyType, size = 15, growTimer = 0, hp = enemyHp })
        spawnTimer = 0
    end

    -- Update enemies
    for i=#enemies,1,-1 do
        local e = enemies[i]
        local speed = 100

        if e.type == "blue" then
            speed = 200
            if e.x < truck.x then e.x = e.x + 50 * dt end
            if e.x > truck.x then e.x = e.x - 50 * dt end
        elseif e.type == "green" then
            e.growTimer = e.growTimer + dt
            if e.growTimer >= 0.5 and e.size < 30 then
                e.size = e.size + 2
                e.growTimer = 0
            end
        elseif e.type == "red" then
            if math.random() < 0.01 then
                table.insert(enemyBullets, { x = e.x, y = e.y + e.size })
            end
        end

        e.y = e.y + speed * dt

        if math.abs(e.x - truck.x) < e.size + 20 and math.abs(e.y - truck.y) < e.size + 10 then
            truck.hp = truck.hp - 1
            table.remove(enemies, i)
            if truck.hp <= 0 then gameOver = true end
        elseif e.y > 600 then
            table.remove(enemies, i)
        end
    end

    -- Update enemy bullets
    for i=#enemyBullets,1,-1 do
        local eb = enemyBullets[i]
        eb.y = eb.y + 300 * dt
        if math.abs(eb.x - truck.x) < 10 and math.abs(eb.y - truck.y) < 10 then
            truck.hp = truck.hp - 2
            table.remove(enemyBullets, i)
            if truck.hp <= 0 then gameOver = true end
        elseif eb.y > 600 then
            table.remove(enemyBullets, i)
        end
    end

    -- Part pick up
    for i = #parts, 1, -1 do
    local p = parts[i]
        if math.abs(truck.x - p.x) < p.size and math.abs(truck.y - p.y) < p.size then
            addToInventory(p.type)
            table.remove(parts, i)
        end
    end
end

-- Add item to inventory
function addItem(partType)
    table.insert(inventory.items, {
        type = partType
    })
end

-- Spawn part when enemy is defeated
function spawnPart(x, y, partType)
    table.insert(parts, {
        x = x,
        y = y,
        size = 10,
        type = partType
    })
end

-- Open inventory
inventoryOpen = false

function love.keypressed(key)
    if key == "i" then
        inventoryOpen = not inventoryOpen
    end

    if key == "c" and inventoryOpen then
        local ability = craft()

    if ability then
        applyAbility(ability)

        abilityMessage = "Unlocked ability: " .. ability
        abilityMessageTimer = 3 

        table.sort(selected, function(a,b) return a>b end)
        for _, index in ipairs(selected) do
            table.remove(inventory.items, index)
        end
        selected = {}
    end
    end
end

function applyUpgrade(enemyType)
    if enemyType == "red" then
        truck.attack = truck.attack + 1
    elseif enemyType == "blue" then
        truck.speed = truck.speed + 50
    elseif enemyType == "green" then
        truck.hp = truck.hp + 1
    end
end

function addToInventory(partType)
    table.insert(inventory.items, { type = partType })
end


function love.mousepressed(mx, my, button)
    if not inventoryOpen then return end
    if button ~= 1 then return end  

    local x = 50
    local y = 100
    local size = 40

    for i, item in ipairs(inventory.items) do
        if mx > x and mx < x+size and my > y and my < y+size then
            if selected[i] then
                selected[i] = nil
            else
                local count = 0
                for _ in pairs(selected) do count = count + 1 end
                if count < 2 then
                    selected[i] = true
                end
            end
            break
        end

        x = x + size + 10
        if x > 400 then
            x = 50
            y = y + size + 10
        end
    end
end

function drawInventory()
    love.graphics.print("INVENTORY", 50, 50)

    local x = 50
    local y = 100
    local size = 40

    for i, item in ipairs(inventory.items) do

        if selected[i] then
            love.graphics.setColor(1, 1, 0) 
            love.graphics.rectangle("line", x-2, y-2, size+4, size+4)
        end

        love.graphics.setColor(1, 1, 1)
        love.graphics.rectangle("line", x, y, size, size)

        if item.type == "attack_part" then
            love.graphics.setColor(1, 0, 0)
        elseif item.type == "speed_part" then
            love.graphics.setColor(0, 0, 1)
        elseif item.type == "hp_part" then
            love.graphics.setColor(0, 1, 0)
        elseif item.type == "purple_part" then
            love.graphics.setColor(1, 0, 1)
        elseif item.type == "cyan_part" then
            love.graphics.setColor(0, 1, 1)
        elseif item.type == "yellow_part" then
            love.graphics.setColor(1, 1, 0)
        end

        love.graphics.rectangle("fill", x+4, y+4, size-8, size-8)

        love.graphics.setColor(1, 1, 1)

        x = x + size + 10
        if x > 400 then
            x = 50
            y = y + size + 10
        end
    end
end

-- Crafting function
function craft()
    local indexes = {}
    for i in pairs(selected) do table.insert(indexes, i) end

    if #indexes ~= 2 then
        return nil
    end

    local t1 = inventory.items[indexes[1]].type
    local t2 = inventory.items[indexes[2]].type

    local pair = {t1, t2}
    table.sort(pair)

    for _, recipe in ipairs(recipes) do
        local req = {unpack(recipe.parts)}
        table.sort(req)

        if req[1] == pair[1] and req[2] == pair[2] then
            
            local ability = recipe.ability

            table.sort(indexes, function(a,b) return a>b end)
            for _, idx in ipairs(indexes) do
                table.remove(inventory.items, idx)
            end

            table.insert(inventory.items, {type = recipe.new_part})

            selected = {}

            return ability
        end
    end

    return nil
end

-- Adding abilities
function applyAbility(ability)
    if ability == "Decreased fire rate" then
        truck.fireRate = math.max(0.2, truck.fireRate - 0.2)
    elseif ability == "Fast shot" then 
        truck.bulletSpeed = truck.bulletSpeed + 150
    elseif ability == "More HP" then
        truck.hp = truck.hp + 5
    end
end

function love.draw()
    if abilityMessageTimer > 0 then
        love.graphics.setColor(1, 1, 0)
        love.graphics.printf(abilityMessage, 0, 200, 800, "center")
        love.graphics.setColor(1, 1, 1)
    end
    if gameOver then
        love.graphics.printf("Game Over", 0, 250, 800, "center")
        love.graphics.printf("Press R to Restart", 0, 300, 800, "center")
        love.graphics.printf("Kills: " .. killCount, 0, 350, 800, "center")
        return
    end

    -- Draw truck
    love.graphics.setColor(1, 1, 1)
    love.graphics.rectangle("fill", truck.x - 20, truck.y - 10, 40, 20)

    -- Draw bullets
    for _, b in ipairs(bullets) do
        love.graphics.rectangle("fill", b.x - 2, b.y - 10, 4, 10)
    end

    -- UI for inventory
    if inventoryOpen then
        drawInventory()
        return
    end

    -- Draw enemies
    for _, e in ipairs(enemies) do
        if e.type == "red" then love.graphics.setColor(1, 0, 0)
        elseif e.type == "blue" then love.graphics.setColor(0, 0, 1)
        elseif e.type == "green" then love.graphics.setColor(0, 1, 0)
        end
        love.graphics.circle("fill", e.x, e.y, e.size)
    end

    -- Draw enemy bullets
    love.graphics.setColor(1, 0, 0)
    for _, eb in ipairs(enemyBullets) do
        love.graphics.rectangle("fill", eb.x - 2, eb.y - 10, 4, 10)
    end

    -- Part colors
    for _, p in ipairs(parts) do
        if p.type == "attack_part" then
            love.graphics.setColor(1, 0, 0)
        elseif p.type == "speed_part" then
            love.graphics.setColor(0, 0, 1)
        elseif p.type == "hp_part" then
            love.graphics.setColor(0, 1, 0)
        else
            love.graphics.setColor(1, 1, 1)
        end

        love.graphics.circle("fill", p.x, p.y, p.size)
    end

love.graphics.setColor(1, 1, 1)
    -- Draw HUD
    love.graphics.setColor(1, 0, 0)
    love.graphics.rectangle("fill", 10, 10, 20 * truck.hp, 20)
    love.graphics.setColor(1, 1, 1)
    love.graphics.print("HP: " .. truck.hp, 10, 35)
    love.graphics.print("Attack: " .. truck.attack, 10, 55)
    love.graphics.print("Speed: " .. truck.speed, 10, 75)
    love.graphics.print("Kills: " .. killCount, 10, 95)
    love.graphics.print("Fire rate: " .. truck.fireRate, 10, 115)
end
-- Crafting recipes
recipes = {
    {
        parts = {"attack_part", "speed_part"},
        ability = "Decreased fire rate",
        new_part = "purple_part"
    },
    {
        parts = {"speed_part", "hp_part"},
        ability = "Fast shot",
        new_part = "cyan_part"
    },
    {
        parts = {"attack_part", "hp_part"},
        ability = "More HP",
        new_part = "yellow_part"
    }
}
