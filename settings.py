bad_words = ["rm ","write","while True:","open "]
python_path = "/usr/bin/python"
prepend = """import numpy
import numbers
import scipy
from scipy import ndimage
from scipy import integrate
from scipy import special
import matplotlib
matplotlib.use('agg')
from pylab import *
from PIL import Image
from PIL import ImageOps
from freesteam import *
from glob import glob
import time

def save_image(imname):
	tim = str(int(time.time()))	
	image = "images/"+imname+"_img_"+str(int(time.time()*1000))+".png"
	print "##_holder_##:",image
	savefig(image)

"""


#don't touch hereon out
