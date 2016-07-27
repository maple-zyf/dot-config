import XMonad
import XMonad hiding (Tall)
import XMonad.Actions.CycleWS
import XMonad.Actions.FloatKeys
import XMonad.Actions.GridSelect
import XMonad.Actions.WithAll
import XMonad.Hooks.DynamicHooks
import XMonad.Hooks.DynamicLog
import XMonad.Hooks.ManageDocks
import XMonad.Hooks.ManageHelpers
import XMonad.Hooks.UrgencyHook
import XMonad.Layout.ComboP
import XMonad.Layout.LayoutCombinators hiding ((|||))
import XMonad.Layout.LayoutHints
import XMonad.Layout.NoBorders
import XMonad.Layout.ResizableTile
import XMonad.Layout.TwoPane
import XMonad.Layout.Spacing
import XMonad.Layout.NoBorders
import XMonad.Layout.LimitWindows -- add limitWindows to limits the number of shown windows
--import XMonad.Layout.StackTile -- onWorkspace  "5" (StackTile 1 (3/100) (1/2) ||| Full) $
import XMonad.Layout.OneBig -- onWorkspace  "5" (OneBig (3/4) (3/4) ||| Full) $ 
--import XMonad.Layout.Gaps -- onWorkspace "5" (gaps [(U,18), (R,23)] $ Tall 1 (3/100) (1/2) ||| Full) 
--import XMonad.Layout.Spacing
--import XMonad.Layout.NoBorders(smartBorders)
import XMonad.Layout.PerWorkspace -- use onWorkspace 
--import XMonad.Layout.IM
--import XMonad.Layout.Grid --import XMonad.Actions.GridSelect
--import XMonad.Layout.LayoutBuilder
--import XMonad.Layout.Tabbed
import XMonad.Layout.ToggleLayouts
import XMonad.Layout.LayoutModifier
--import XMonad.Layout.Accordion
import XMonad.Layout.Circle
import XMonad.ManageHook
import XMonad.Prompt
import XMonad.Prompt.Shell
import XMonad.Util.Run
import Control.Monad (liftM2)
import Data.Monoid
import Graphics.X11
import Graphics.X11.Xinerama
import System.Exit
import System.IO

--import XMonad.Layout.ImageButtonDecoration
--import XMonad.Actions.WindowMenu
--import XMonad.Layout.Decoration

import qualified XMonad.Actions.FlexibleResize as Flex
import qualified XMonad.StackSet as W
import qualified Data.Map as M
 
-- XMonad:
--myL = imageButtonDeco shrinkText defaultThemeWithImageButtons (layoutHook defaultConfig)

main = do
  xmobar <- spawnPipe "/usr/local/bin/xmobar /home/vimer/scripts/xmobarrc-archwiki"
  xmonad $ defaultConfig
 
    { terminal           = myTerminal
    , focusFollowsMouse  = myFocusFollowsMouse
    , borderWidth        = myBorderWidth
    , modMask            = myModMask
    , workspaces         = myWorkspaces
    , normalBorderColor  = myNormalBorderColor
    , focusedBorderColor = myFocusedBorderColor
 
    , keys               = myKeys
    , mouseBindings      = myMouseBindings
    , handleEventHook    = docksEventHook <+> handleEventHook defaultConfig
    , layoutHook         = avoidStruts $ myLayout
    , manageHook         = myManageHook <+> manageDocks <+> dynamicMasterHook
    --, manageHook         = manageDocks <+> myManageHook <+> manageHook defaultConfig
    , logHook            = dynamicLogWithPP $ myXmobarPP xmobar
    }
 
myModMask = altMask
myTerminal = "terminator"
myFocusFollowsMouse = True
myBorderWidth = 2
myNormalBorderColor = "#0f0f0f"
myFocusedBorderColor = "#1f1f1f"
noborderFull=  noBorders $ Full
defaultLayouts = tiled ||| Mirror tiled ||| noborderFull where 
	-- default tiling algorithm partitions the screen into two panes
	tiled = smartSpacing 4 $ Tall nmaster delta ratio 
	-- The default number of windows in the master pane 
	nmaster = 1 
	-- Default proportion of screen occupied by master pane 
	ratio = 2/3 
	-- Percent of screen to increment by when resizing panes 
	delta = 6/100
xmobarEscape = concatMap doubleLts
  where doubleLts '<' = "<<"
        doubleLts x   = [x]
myWorkspaces :: [String]
--myWorkspaces = ["1:crap","2:console","3:web","4:media","5","6","7"]
myWorkspaces = clickable . (map xmobarEscape) $ ["1:crap","2:console","3:web","4:media","5","6","7"]
  where                                                                       
         clickable l = [ "<action=`xdotool key alt+" ++ show (n) ++ "`>" ++ ws ++ "</action>" |
                             (i,ws) <- zip [1..7] l,                                        
                            let n = i ]

 
--myLayout = defaultLayouts
{-
myLayout = onWorkspace  "1:crap" (Circle) $
            onWorkspace  "2:console"  (limitWindows 5 $ Circle ||| noborderFull) $ 
            onWorkspaces ["3:web", "4:media"] (noBorders $ Full) $ 
            onWorkspace  "5" (OneBig (3/4) (3/4) ||| Full) $
            onWorkspace  "6" defaultLayouts $
            defaultLayouts
-}
myLayout =  onWorkspace  (myWorkspaces !! 0) defaultLayouts $
            onWorkspace  (myWorkspaces !! 1) (limitWindows 5 $ Circle ||| noborderFull) $
            onWorkspace  (myWorkspaces !! 2) (noBorders $ Full) $
            onWorkspace  (myWorkspaces !! 3) (noBorders $ Full) $
            onWorkspace  (myWorkspaces !! 4) (OneBig (3/4) (3/4) ||| Full) $
            onWorkspace  (myWorkspaces !! 5) defaultLayouts $
            onWorkspace  (myWorkspaces !! 6) defaultLayouts $
            defaultLayouts

-- myXmobarPP
myXmobarPP foo= defaultPP
	{ ppOutput = hPutStrLn foo
	, ppTitle = xmobarColor "blue" "" . shorten 50   
	, ppCurrent = xmobarColor "yellow" "" . wrap "[*" "*]"
	, ppOrder = \(ws:l:t:_) -> [ws]                      -- show workspace and hide std-echo
	, ppHidden= xmobarColor "white" ""	
	, ppHiddenNoWindows = xmobarColor "grey" ""
	, ppLayout = const "" -- to disable the layout info on xmobar  
	}


-- Window rules: use xprop to get the STRING
-- resource (also known as appName) is the first element in WM_CLASS(STRING)
-- className is the second element in WM_CLASS(STRING)
-- title is WM_NAME(STRING) 
-- Use stringProperty to extract string information, for example:
-- 		stringProperty "WM_WINDOW_ROLE" =? "presentationWidget" --> doFloat
myManageHook = composeAll . concat $
    [ [isDialog --> doCenterFloat]
	, [className =? "Pan" --> doFloat]
    , [resource =? src --> doFloat | src <- resourceFloats]
    , [className =? cls --> doFloat | cls <- classFloats]
    , [title =? tit --> doFloat | tit <- titleFloats]
    , [className =? ign --> doIgnore | ign <- classIgnores]

--    , [(className =? x <||> title =? x <||> resource =? x) --> doShift "1:irc" | x <- my1Shifts]
--    , [(className =? x <||> title =? x <||> resource =? x) --> doShift "2:www" | x <- my2Shifts]
--    , [(className =? x <||> title =? x <||> resource =? x) --> doShift "3:music" | x <- my3Shifts]
--    , [(className =? x <||> title =? x <||> resource =? x) --> doShiftAndGo "4:misc" | x <- my4Shifts]
--    , [(className =? x <||> title =? x <||> resource =? x) --> doShiftAndGo "5:xbmc" | x <- my5Shifts]
--    , [(className =? x <||> title =? x <||> resource =? x) --> doShiftAndGo "6:GIMP" | x <- my6Shifts]
--    , [(className =? x <||> title =? x <||> resource =? x) --> doShiftAndGo "7:slideshow!" | x <- my7Shifts]
--    , [(className =? x <||> title =? x <||> resource =? x) --> doShiftAndGo "8:foo()" | x <- my8Shifts]
    , [(className =? x <||> title =? x <||> resource =? x) --> doShiftAndGo (myWorkspaces !! 3) | x <- mediaShifts]
    , [(className =? x <||> title =? x <||> resource =? x) --> doShiftAndGo (myWorkspaces !! 2) | x <- webShifts]
    ]
    where
    doShiftAndGo = doF . liftM2 (.) W.greedyView W.shift
    resourceFloats = ["Pan","Places"]
    classFloats = ["netease-cloud-music"]
    titleFloats = ["Pan Filter Preferences","Choose Proxy Server for Rule Groups"]
    classIgnores =[] --["netease-cloud-music"]
--    my1Shifts = []
--    my2Shifts = ["Chromium"]
--    my3Shifts = ["Deadbeef", "Gmpc"]
--    my4Shifts = ["Eog", "Evince", "Gthumb", "Nautilus", "Pcmanfm", "Pinta"]
--    my5Shifts = ["MPlayer", "xbmc.bin"]
--    my6Shifts = ["Gimp"]
--    my7Shifts = ["feh"]
--    my8Shifts = ["Easytag", "Gconf-editor", "Inkscape", "K3b", "MusicBrainz Picard", "tmw", "Twf", "VCLSalFrame.DocumentWindow"]
    mediaShifts = ["netease-cloud-music"]
    webShifts = ["chromium-browser", "Iceweasel", "Firefox"]
 

-- Key bindings:
altMask = mod1Mask
winMask = mod4Mask
myKeys conf@(XConfig {XMonad.modMask = modMask}) = M.fromList $
	[ --, ((mod1Mask,               xK_b     ), sendMessage ToggleStruts)
		--, ((mod4Mask, xK_Tab), [(W.view, 0), (W.shift, shiftMask) ])
		--    , ((mod4Mask, xK_Tab), windows $ W.greedyView (XMonad.wrokspaces conf))
	--    , [((m .|. modMask, k), windows $ f i)
		--       | (i, k) <- zip (XMonad.workspaces conf) [xK_1 .. xK_9]
		--      , (f, m) <- [(W.greedyView, 0), (W.shift, shiftMask)]]
	

--    , ((mod4Mask, xK_q), spawn "urxvt -name irssi -e ssh and1@server")
--    , ((mod4Mask, xK_w), spawn "nitrogen --no-recurse --sort=alpha")
--    , ((mod4Mask, xK_e), spawn "chromium")
--    , ((mod4Mask, xK_r), spawn "urxvt")
--    , ((mod4Mask .|. shiftMask, xK_r), oneShotHook (className =? "URxvt") (doF $ (W.swapUp . W.shiftMaster)) >> spawn "urxvt")
--    , ((mod4Mask, xK_i), spawn "inkscape")
--    , ((mod4Mask, xK_o), spawn "libreoffice")
--    , ((mod4Mask, xK_p), shellPrompt myXPConfig)
--    , ((mod4Mask, xK_s), spawn "feh --auto-zoom --full-screen --hide-pointer --randomize --slideshow-delay 5 --title \"feh() | %n\" /home/and1/wallpapers/*.jpg /home/and1/wallpapers/*.png")
--    , ((mod4Mask, xK_f), oneShotHook (className =? "URxvt") doFloat >> spawn "urxvt -g 100x25+25+875") -- MonteCarlo
--    , ((mod4Mask .|. shiftMask, xK_f), oneShotHook (className =? "URxvt") doFloat >> spawn "urxvt -g 100x10+25+1040") -- MonteCarlo
--    , ((mod4Mask, xK_g), spawn "gimp")
--    , ((mod4Mask, xK_k), spawn "k3b")
--    , ((mod4Mask, xK_l), spawn "slock")
--    , ((mod4Mask, xK_x), spawn "xbmc")
--    , ((mod4Mask, xK_v), spawn "virtualbox")
--    , ((mod4Mask, xK_n), spawn "nautilus")
--    , ((mod4Mask, xK_m), spawn "gmpc")
--    , ((mod4Mask, xK_Print), spawn "scrot screen_%Y-%m-%d.png -d 1") -- take screenshot
--    , ((modMask .|. controlMask, xK_Home), spawn "mpc toggle") -- play/pause song
--    , ((modMask .|. controlMask, xK_End), spawn "mpc stop") -- stop playback
--    , ((modMask .|. controlMask, xK_Prior), spawn "mpc prev") -- previous song
--    , ((modMask .|. controlMask, xK_Next), spawn "mpc next") -- next song
--    , ((modMask, xK_Tab), windows W.focusDown) -- move focus to the next window
--    , ((modMask, xK_j), windows W.focusDown) -- move focus to the next window
--    , ((modMask, xK_k), windows W.focusUp) -- move focus to the previous window
--    , ((modMask, xK_b), sendMessage ToggleStruts) -- toggle the statusbar gap
--    , ((modMask, xK_m), windows W.swapMaster) -- swap the focused window and the master window
--    , ((modMask, xK_comma), sendMessage (IncMasterN 1)) -- increment the number of windows in the master area
--    , ((modMask, xK_period), sendMessage (IncMasterN (-1))) -- deincrement the number of windows in the master area
--    , ((modMask, xK_Return), windows W.focusMaster) -- move focus to the master window
--    , ((modMask, xK_f), sendMessage NextLayout) -- rotate through the available layout algorithms
--    , ((modMask, xK_g), goToSelected ) -- display grid select and go to selected window
--    , ((modMask, xK_Left), prevWS) -- switch to previous workspace
--    , ((modMask, xK_Right), nextWS) -- switch to next workspace
--    , ((modMask .|. shiftMask, xK_Tab), windows W.focusUp) -- move focus to the previous window
----    , ((modMask .|. shiftMask, xK_g), gridselectWorkspace  W.view) -- display grid select and go to selected workspace
--    , ((modMask .|. shiftMask, xK_h), sendMessage Shrink) -- shrink the master area
--    , ((modMask .|. shiftMask, xK_j), windows W.swapDown) -- swap the focused window with the next window
--    , ((modMask .|. shiftMask, xK_k), windows W.swapUp)  -- swap the focused window with the previous window
--    , ((modMask .|. shiftMask, xK_l), sendMessage Expand) -- expand the master area
--    , ((modMask .|. shiftMask, xK_Return), focusUrgent) -- move focus to urgent window
--    , ((modMask .|. controlMask, xK_q), io (exitWith ExitSuccess)) -- quit xmonad
--    , ((modMask .|. controlMask, xK_r), spawn "killall conky dzen2 && xmonad --recompile && xmonad --restart") -- restart xmonad
--    , ((modMask .|. controlMask, xK_d), withFocused $ windows . W.sink) -- push window back into tiling
--    , ((modMask .|. controlMask, xK_f), setLayout $ XMonad.layoutHook conf) -- reset the layouts on the current workspace to default
--    , ((modMask .|. controlMask, xK_h), sendMessage MirrorExpand) -- expand the height/width
--    , ((modMask .|. controlMask, xK_j), windows W.swapDown) -- swap the focused window with the next window
--    , ((modMask .|. controlMask, xK_k), windows W.swapUp)  -- swap the focused window with the previous window
--    , ((modMask .|. controlMask, xK_l), sendMessage MirrorShrink) -- shrink the height/width
--    , ((modMask .|. controlMask, xK_x), kill) -- close focused window
--    , ((modMask .|. controlMask, xK_Left), withFocused (keysMoveWindow (-30,0))) -- move floated window 10 pixels left
--    , ((modMask .|. controlMask, xK_Right), withFocused (keysMoveWindow (30,0))) -- move floated window 10 pixels right
--    , ((modMask .|. controlMask, xK_Up), withFocused (keysMoveWindow (0,-30))) -- move floated window 10 pixels up
--    , ((modMask .|. controlMask, xK_Down), withFocused (keysMoveWindow (0,30))) -- move floated window 10 pixels down
-- launching and killing programs
	  ((winMask, xK_Return), spawn "terminator" ) -- %! Launch terminal
	, ((winMask .|. shiftMask, xK_Return ), kill) -- %! Close the focused window
	, ((winMask .|. shiftMask, xK_BackSpace), killAll) -- %! Close all windows in the workspace

	, ((altMask,               xK_p     ), spawn "dmenu_run") -- %! Launch dmenu
	, ((altMask, xK_f ), spawn "firefox --profile /home/maple/.mozilla/firefox/4skdfdsr.xmonad") 

	, ((altMask, xK_Tab), nextWS)  -- %! more stuff about workspace, see XMonad.Actions.CycleWS
	, ((modMask,               xK_space ), sendMessage NextLayout) -- %! Rotate through the available layout algorithms
	, ((modMask .|. shiftMask, xK_space ), setLayout $ XMonad.layoutHook conf) -- %!  Reset the layouts on the current workspace to default

  	, ((modMask,               xK_n     ), refresh) -- %! Resize viewed windows to the correct size

-- move focus up or down the window stack
--	, ((modMask,               xK_Tab   ), windows W.focusDown) -- %! Move focus to the next window
--	, ((modMask .|. shiftMask, xK_Tab   ), windows W.focusUp  ) -- %! Move focus to the previous window
	, ((winMask,               xK_j     ), windows W.focusDown) -- %! Move focus to the next window
	, ((winMask,               xK_k     ), windows W.focusUp  ) -- %! Move focus to the next window
	, ((winMask,               xK_m     ), windows W.focusMaster  ) -- %! Move focus to the master window

	, ((winMask,               xK_h     ), sendMessage Shrink ) -- %! Shrink the master area
	, ((winMask,               xK_l     ), sendMessage Expand ) -- %! Shrink the master area

	-- modifying the window order
--	, ((modMask,               xK_Return), windows W.swapMaster) -- %! Swap the focused window and the master window
	, ((winMask .|. shiftMask, xK_j     ), windows W.swapDown  ) -- %! Swap the focused window with the next window
	, ((winMask .|. shiftMask, xK_k     ), windows W.swapUp    ) -- %! Swap the focused window with the previous window

	-- floating layer support
	--, ((altMask,               xK_t     ), withFocused $ windows . W.sink) -- %! Push window back into tiling
	, ((altMask,               xK_s     ), sinkAll) -- %! Push all windows back into tiling

	-- increase or decrease number of windows in the master area
	, ((modMask              , xK_comma ), sendMessage (IncMasterN 1)) -- %! Increment the number of windows in the master area
	, ((modMask              , xK_period), sendMessage (IncMasterN (-1))) -- %! Deincrement the number of windows in the master area

	-- quit, or restart
        , ((mod1Mask .|. controlMask, xK_q), io (exitWith ExitSuccess)) -- quit xmonad
	, ((mod1Mask              , xK_q     ), spawn "if type xmonad; then xmonad --recompile && xmonad --restart; else xmessage xmonad not in \\$PATH: \"$PATH\"; fi") -- %! Restart xmonad

--	, ((modMask .|. shiftMask, xK_slash ), spawn ("echo \"" ++ help ++ "\" | xmessage -file -")) -- %! Run xmessage with a summary of the default keybindings (useful for beginners)
	-- repeat the binding for non-American layout keyboards
--	, ((modMask              , xK_question), spawn ("echo \"" ++ help ++ "\" | xmessage -file -"))
--	, ((altMask, xK_Tab), windows $ W.greedyView (XMonad.wrokspaces conf))
	]
    ++
    [ ((m .|. modMask, k), windows $ f i)
    | (i, k) <- zip (XMonad.workspaces conf) [xK_1 .. xK_9] -- mod-[1..9], switch to workspace n
    --, (f, m) <- [(W.greedyView, 0), (W.shift, shiftMask)] -- mod-shift-[F1..F9], move window to workspace n
    , (f, m) <- [(W.view, 0), (W.shift, shiftMask)] -- mod-shift-[F1..F9], move window to workspace n
    ]
    ++
    [ ((m .|. modMask, key), screenWorkspace sc >>= flip whenJust (windows . f))
    | (key, sc) <- zip [xK_w, xK_e, xK_r] [0..] -- mod-{F10,F11,F12}, switch to physical/Xinerama screens 1, 2, or 3
    , (f, m) <- [(W.view, 0), (W.shift, shiftMask)] -- mod-shift-{F10,F11,F12}, move window to screen 1, 2, or 3
    ]
 
-- Mouse bindings:
myMouseBindings (XConfig {XMonad.modMask = modMask}) = M.fromList $
    [ ((winMask, button1), (\w -> focus w >> mouseMoveWindow w >> windows W.shiftMaster)) -- set the window to floating mode and move by dragging
    , ((altMask, button1), windows . W.sink) -- %! Push window back into tiling
    , ((winMask .|. shiftMask, button1), (\w -> focus w >> kill)) -- %! kill current window
    , ((winMask, button2), (\w -> focus w >> windows W.shiftMaster)) -- raise the window to the top of the stack
    , ((winMask, button3), (\w -> focus w >> Flex.mouseResizeWindow w)) -- set the window to floating mode and resize by dragging
    , ((winMask, button4), (\_ -> prevWS)) -- switch to previous workspace
    , ((winMask, button5), (\_ -> nextWS)) -- switch to next workspace
    ]
 

