extends Node

var was_last_emulated: = false
var _web_back_callback: JavaScriptObject
var _web_menu_visible: bool = false
var _save_callback: JavaScriptObject

func _ready() -> void:
	if OS.has_feature("web"):
		_web_back_callback = JavaScriptBridge.create_callback(_web_back)
		JavaScriptBridge.get_interface("window").registerYosugaBack(_web_back_callback)
		_register_saves.call_deferred()

func _register_saves() -> void:
	_save_callback = JavaScriptBridge.create_callback(preload("res://WebSaveTransfer.gd").handle)
	JavaScriptBridge.get_interface("window").registerYosugaSaves(_save_callback)

func _process(_delta: float) -> void:
	if not OS.has_feature("web"):
		return
	var menu_visible: bool = get_tree().get_nodes_in_group("web_menu").size() > 0
	if menu_visible != _web_menu_visible:
		_web_menu_visible = menu_visible
		JavaScriptBridge.get_interface("window").setYosugaMenuOpen(menu_visible)

func _web_back(_arguments: Array) -> void:
	if not _web_menu_visible:
		return
	Input.action_press("hit_cancel")
	await get_tree().process_frame
	await get_tree().process_frame
	Input.action_release("hit_cancel")

func _input(event: InputEvent) -> void :
	if event is InputEventMouse:
		was_last_emulated = event.device == InputEvent.DEVICE_ID_EMULATION
	elif event is InputEventScreenTouch:
		if event.index == 1:
			var ev: = InputEventMouseButton.new()
			ev.device = InputEvent.DEVICE_ID_EMULATION
			ev.button_index = MOUSE_BUTTON_RIGHT
			ev.position = event.position
			ev.pressed = event.pressed
			Input.parse_input_event(ev)
