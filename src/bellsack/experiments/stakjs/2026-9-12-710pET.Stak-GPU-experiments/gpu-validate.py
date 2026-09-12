#!/usr/bin/env python3
"""Compile/render standalone GLSL ES 3 shaders with surfaceless Mesa EGL.

This is correctness validation on a SOFTWARE renderer, not a GPU benchmark.
Input JSON: {cases:[{name,source,width,height,uniforms:{name:[...]}}]}.
Optional probes use a width x 1 shader and include expected rgba values.
"""
import argparse
import ctypes as C
import json
import math
import os
from pathlib import Path

os.environ.setdefault('EGL_PLATFORM', 'surfaceless')
os.environ.setdefault('LIBGL_ALWAYS_SOFTWARE', '1')
E = C.CDLL('libEGL.so.1')
void = C.c_void_p
integer = C.c_int
uint = C.c_uint
float32 = C.c_float

def egl(name, restype, *types):
	f = getattr(E, name)
	f.restype = restype
	f.argtypes = types
	return f

get_display = egl('eglGetDisplay', void, void)
initialize = egl('eglInitialize', uint, void, C.POINTER(integer), C.POINTER(integer))
bind_api = egl('eglBindAPI', uint, uint)
choose_config = egl('eglChooseConfig', uint, void, C.POINTER(integer), C.POINTER(void), integer, C.POINTER(integer))
create_context = egl('eglCreateContext', void, void, void, void, C.POINTER(integer))
make_current = egl('eglMakeCurrent', uint, void, void, void, void)
get_proc = egl('eglGetProcAddress', void, C.c_char_p)
get_error = egl('eglGetError', uint)

display = get_display(None)
major, minor = integer(), integer()
if not initialize(display, C.byref(major), C.byref(minor)):
	raise RuntimeError('eglInitialize failed: '+hex(get_error()))
if not bind_api(0x30A0):
	raise RuntimeError('eglBindAPI GLES failed')
attrs = (integer * 15)(0x3033, 1, 0x3040, 0x40, 0x3024, 8, 0x3023, 8, 0x3022, 8, 0x3021, 8, 0x3038, 0, 0)
config, count = void(), integer()
if not choose_config(display, attrs, C.byref(config), 1, C.byref(count)) or count.value != 1:
	raise RuntimeError('No EGL ES3 config: '+hex(get_error()))
context = create_context(display, config, None, (integer * 3)(0x3098, 3, 0x3038))
if not context or not make_current(display, None, None, context):
	raise RuntimeError('Creating current GLES3 context failed: '+hex(get_error()))

def gl(name, restype, *types):
	ptr = get_proc(name.encode())
	if not ptr:
		raise RuntimeError('Missing '+name)
	return C.CFUNCTYPE(restype, *types)(ptr)

get_string = gl('glGetString', C.c_char_p, uint)
get_gl_error = gl('glGetError', uint)
create_shader = gl('glCreateShader', uint, uint)
shader_source = gl('glShaderSource', None, uint, integer, C.POINTER(C.c_char_p), C.POINTER(integer))
compile_shader = gl('glCompileShader', None, uint)
get_shader_iv = gl('glGetShaderiv', None, uint, uint, C.POINTER(integer))
get_shader_log = gl('glGetShaderInfoLog', None, uint, integer, C.POINTER(integer), C.c_void_p)
create_program = gl('glCreateProgram', uint)
attach_shader = gl('glAttachShader', None, uint, uint)
link_program = gl('glLinkProgram', None, uint)
get_program_iv = gl('glGetProgramiv', None, uint, uint, C.POINTER(integer))
get_program_log = gl('glGetProgramInfoLog', None, uint, integer, C.POINTER(integer), C.c_void_p)
use_program = gl('glUseProgram', None, uint)
get_uniform_location = gl('glGetUniformLocation', integer, uint, C.c_char_p)
uniform1f = gl('glUniform1f', None, integer, float32)
uniform2f = gl('glUniform2f', None, integer, float32, float32)
uniform3f = gl('glUniform3f', None, integer, float32, float32, float32)
uniform4f = gl('glUniform4f', None, integer, float32, float32, float32, float32)
uniform1i = gl('glUniform1i', None, integer, integer)
uniform1fv = gl('glUniform1fv', None, integer, integer, C.POINTER(float32))
gen_framebuffers = gl('glGenFramebuffers', None, integer, C.POINTER(uint))
bind_framebuffer = gl('glBindFramebuffer', None, uint, uint)
gen_textures = gl('glGenTextures', None, integer, C.POINTER(uint))
bind_texture = gl('glBindTexture', None, uint, uint)
tex_image = gl('glTexImage2D', None, uint, integer, integer, integer, integer, integer, uint, uint, void)
tex_parameter = gl('glTexParameteri', None, uint, uint, integer)
framebuffer_texture = gl('glFramebufferTexture2D', None, uint, uint, uint, uint, integer)
check_framebuffer = gl('glCheckFramebufferStatus', uint, uint)
viewport = gl('glViewport', None, integer, integer, integer, integer)
draw_arrays = gl('glDrawArrays', None, uint, integer, integer)
read_pixels = gl('glReadPixels', None, integer, integer, integer, integer, uint, uint, void)
delete_shader = gl('glDeleteShader', None, uint)
delete_program = gl('glDeleteProgram', None, uint)
delete_framebuffers = gl('glDeleteFramebuffers', None, integer, C.POINTER(uint))
delete_textures = gl('glDeleteTextures', None, integer, C.POINTER(uint))

VERTEX = '''#version 300 es
void main(){
	vec2 xy=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));
	gl_Position=vec4(xy*2.0-1.0,0.0,1.0);
}
'''

def compile_one(kind, source):
	s = create_shader(kind)
	b = source.encode()
	p = C.c_char_p(b)
	shader_source(s, 1, C.byref(p), None)
	compile_shader(s)
	ok = integer()
	get_shader_iv(s, 0x8B81, C.byref(ok))
	if not ok.value:
		log = C.create_string_buffer(131072)
		get_shader_log(s, len(log), None, log)
		raise RuntimeError(log.value.decode())
	return s

def render(source, width, height, uniforms):
	vs = compile_one(0x8B31, VERTEX)
	fs = compile_one(0x8B30, source)
	program = create_program()
	attach_shader(program, vs)
	attach_shader(program, fs)
	link_program(program)
	ok = integer()
	get_program_iv(program, 0x8B82, C.byref(ok))
	if not ok.value:
		log = C.create_string_buffer(131072)
		get_program_log(program, len(log), None, log)
		raise RuntimeError(log.value.decode())
	use_program(program)
	for name, value in uniforms.items():
		loc = get_uniform_location(program, name.encode())
		if loc == -1:
			continue
		if isinstance(value, dict):
			if 'int' in value:
				uniform1i(loc, value['int'])
			else:
				flat=value['floats']
				uniform1fv(loc, len(flat), (float32 * len(flat))(*flat))
		else:
			value = value if isinstance(value, list) else [value]
			[None, uniform1f, uniform2f, uniform3f, uniform4f][len(value)](loc, *value)
	fbo, texture = uint(), uint()
	gen_framebuffers(1, C.byref(fbo))
	gen_textures(1, C.byref(texture))
	bind_texture(0x0DE1, texture.value)
	tex_parameter(0x0DE1, 0x2801, 0x2600)
	tex_parameter(0x0DE1, 0x2800, 0x2600)
	tex_image(0x0DE1, 0, 0x8814, width, height, 0, 0x1908, 0x1406, None)
	bind_framebuffer(0x8D40, fbo.value)
	framebuffer_texture(0x8D40, 0x8CE0, 0x0DE1, texture.value, 0)
	if check_framebuffer(0x8D40) != 0x8CD5:
		raise RuntimeError('Float framebuffer incomplete')
	viewport(0, 0, width, height)
	draw_arrays(0x0004, 0, 3)
	data = (float32 * (width * height * 4))()
	read_pixels(0, 0, width, height, 0x1908, 0x1406, data)
	err = get_gl_error()
	delete_shader(vs)
	delete_shader(fs)
	delete_program(program)
	delete_framebuffers(1, C.byref(fbo))
	delete_textures(1, C.byref(texture))
	if err:
		raise RuntimeError('OpenGL error '+hex(err))
	return list(data)

def main():
	parser = argparse.ArgumentParser()
	parser.add_argument('input', nargs='?')
	parser.add_argument('--out', default='gpu-validation')
	args = parser.parse_args()
	report = {'renderer':get_string(0x1F01).decode(),'version':get_string(0x1F02).decode(),
		'kind':'Software GLES correctness validation, not hardware GPU performance','cases':[]}
	if not args.input:
		print(json.dumps(report, indent=2))
		return
	outdir = Path(args.out)
	outdir.mkdir(parents=True, exist_ok=True)
	input_data = json.loads(Path(args.input).read_text())
	images = {}
	for case in input_data['cases']:
		result = {'name':case['name'],'passed':False}
		try:
			width,height = case.get('width',128),case.get('height',96)
			values = render(case['source'],width,height,case.get('uniforms',{}))
			finite = all(math.isfinite(x) for x in values)
			result.update(width=width,height=height,allFinite=finite,
				min=min(values),max=max(values),passed=finite)
			images[case['name']] = values
			if 'expected' in case:
				assert len(values)==len(case['expected'])
				errors = [abs(a-b) for a,b in zip(values,case['expected'])]
				tolerance = case.get('tolerance',1e-4)
				result.update(maxError=max(errors),passed=finite and max(errors)<=tolerance)
			if case.get('image',True):
				from PIL import Image
				pixels = bytes(max(0,min(255,round(x*255))) for y in range(height-1,-1,-1)
					for x in values[y*width*4:(y+1)*width*4])
				Image.frombytes('RGBA',(width,height),pixels).save(outdir/(case['name']+'.png'))
		except Exception as error:
			result['error']=str(error)
		report['cases'].append(result)
		print(json.dumps(result), flush=True)
	report['comparisons']=[]
	for a,b in input_data.get('compare',[]):
		if a not in images or b not in images:
			continue
		x,y=images[a],images[b]
		assert len(x)==len(y)
		errors=[abs(i-j) for i,j in zip(x,y)]
		report['comparisons'].append({'a':a,'b':b,'maxError':max(errors),
			'meanAbsoluteError':sum(errors)/len(errors),
			'channelsOver1Byte':sum(x>1/255 for x in errors),'channels':len(errors)})
	report['passed']=all(x['passed'] for x in report['cases'])
	(outdir/'gpu-validation.json').write_text(json.dumps(report,indent=2))
	print(json.dumps(report,indent=2))

if __name__=='__main__':
	main()
